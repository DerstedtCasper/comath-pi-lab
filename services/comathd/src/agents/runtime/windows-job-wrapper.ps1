$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
# Fixed, service-owned process-tree supervisor. This does not provide filesystem/network isolation.
$request = [Console]::ReadLine() | ConvertFrom-Json
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class CoMathOwnedJob {
 [StructLayout(LayoutKind.Sequential)] struct SA { public int length; public IntPtr descriptor; [MarshalAs(UnmanagedType.Bool)] public bool inherit; }
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] struct SI { public int cb; public string reserved,desktop,title; public int x,y,xSize,ySize,xChars,yChars,fill,flags; public short show,reserved2; public IntPtr reservedPtr,input,output,error; }
 [StructLayout(LayoutKind.Sequential)] struct SIX { public SI start; public IntPtr attributes; }
 [StructLayout(LayoutKind.Sequential)] struct PI { public IntPtr process,thread; public uint pid,tid; }
 [StructLayout(LayoutKind.Sequential)] struct BASIC { public long processTime,jobTime; public uint flags; public UIntPtr minWorking,maxWorking; public uint activeLimit; public UIntPtr affinity; public uint priority,scheduling; }
 [StructLayout(LayoutKind.Sequential)] struct IO { public ulong readOps,writeOps,otherOps,readBytes,writeBytes,otherBytes; }
 [StructLayout(LayoutKind.Sequential)] struct EXT { public BASIC basic; public IO io; public UIntPtr processMemory,jobMemory,peakProcess,peakJob; }
 [StructLayout(LayoutKind.Sequential)] struct ACCOUNT { public long user,kernel,periodUser,periodKernel; public uint faults,total,active,terminated; }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes,string name);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int info,ref EXT data,uint size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool QueryInformationJobObject(IntPtr job,int info,out ACCOUNT data,uint size,IntPtr returned);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateJobObject(IntPtr job,uint code);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool CreatePipe(out IntPtr read,out IntPtr write,ref SA sa,int size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetHandleInformation(IntPtr handle,uint mask,uint flags);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFile(string name,uint access,uint share,ref SA sa,uint creation,uint flags,IntPtr template);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,int flags,ref IntPtr size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returned);
 [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string app,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SIX start,out PI process);
 [DllImport("kernel32.dll",SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetProcessTimes(IntPtr process,out long created,out long exited,out long kernel,out long user);
 [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool TerminateProcess(IntPtr process,uint code);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 static readonly object outputLock=new object();
 static volatile bool cancelled, inputOverflow, protocolError;
 static string sessionNonce="";
 static long queuedInputBytes;
 static void Emit(string json) { lock(outputLock) { Console.WriteLine(json.Insert(1,"\"nonce\":\""+sessionNonce+"\",")); Console.Out.Flush(); } }
 static void Check(bool success,string operation) { if(!success) throw new InvalidOperationException(operation+":"+Marshal.GetLastWin32Error()); }
 static string Quote(string value) { if(value.Length>0 && value.IndexOfAny(new char[]{' ','\t','"'})<0) return value; var b=new StringBuilder("\"");int slashes=0;foreach(char c in value){if(c=='\\'){slashes++;continue;}if(c=='"'){b.Append('\\',slashes*2+1);b.Append(c);}else{b.Append('\\',slashes);b.Append(c);}slashes=0;}b.Append('\\',slashes*2);b.Append('"');return b.ToString(); }
 static Task Pump(IntPtr handle,string type) { return Task.Run(delegate { using(var file=new FileStream(new SafeFileHandle(handle,true),FileAccess.Read,16384,false)){var bytes=new byte[16384];int count;while((count=file.Read(bytes,0,bytes.Length))>0) Emit("{\"type\":\""+type+"\",\"data\":\""+Convert.ToBase64String(bytes,0,count)+"\"}");} }); }
 public static int Run(string program,string[] args,string cwd,string environment,string nonce,long timeout,bool interactive,int stopTimeout,int inputQueueBytes,long startupDeadline) {
  IntPtr job=IntPtr.Zero,outRead=IntPtr.Zero,outWrite=IntPtr.Zero,errRead=IntPtr.Zero,errWrite=IntPtr.Zero,input=IntPtr.Zero,inputWrite=IntPtr.Zero,env=IntPtr.Zero,attributes=IntPtr.Zero,handles=IntPtr.Zero;
  PI process=new PI(); bool assigned=false; Task stdout=null,stderr=null,inputWriter=null; BlockingCollection<byte[]> inputQueue=null;
  try {
   if(!System.Text.RegularExpressions.Regex.IsMatch(nonce,"^[a-f0-9-]{36}$")) throw new InvalidOperationException("invalid_nonce");
   sessionNonce=nonce;
   job=CreateJobObject(IntPtr.Zero,"Local\\CoMath-"+nonce);Check(job!=IntPtr.Zero,"create_job");
   var limits=new EXT();limits.basic.flags=0x2000;Check(SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf(typeof(EXT))),"kill_on_close");
   var security=new SA{length=Marshal.SizeOf(typeof(SA)),inherit=true};
   Check(CreatePipe(out outRead,out outWrite,ref security,0),"stdout_pipe");Check(SetHandleInformation(outRead,1,0),"stdout_noinherit");
   Check(CreatePipe(out errRead,out errWrite,ref security,0),"stderr_pipe");Check(SetHandleInformation(errRead,1,0),"stderr_noinherit");
   if(interactive){Check(CreatePipe(out input,out inputWrite,ref security,0),"stdin_pipe");Check(SetHandleInformation(inputWrite,1,0),"stdin_noinherit");}
   else {input=CreateFile("NUL",0x80000000,3,ref security,3,0,IntPtr.Zero);Check(input!=new IntPtr(-1),"stdin_nul");}
   IntPtr attributeSize=IntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref attributeSize);attributes=Marshal.AllocHGlobal(attributeSize);Check(InitializeProcThreadAttributeList(attributes,1,0,ref attributeSize),"attribute_list");
   handles=Marshal.AllocHGlobal(IntPtr.Size*3);Marshal.WriteIntPtr(handles,0,input);Marshal.WriteIntPtr(handles,IntPtr.Size,outWrite);Marshal.WriteIntPtr(handles,IntPtr.Size*2,errWrite);
   Check(UpdateProcThreadAttribute(attributes,0,new IntPtr(0x20002),handles,new IntPtr(IntPtr.Size*3),IntPtr.Zero,IntPtr.Zero),"restricted_handle_list");
   var startup=new SIX();startup.start.cb=Marshal.SizeOf(typeof(SIX));startup.start.flags=0x100;startup.start.input=input;startup.start.output=outWrite;startup.start.error=errWrite;startup.attributes=attributes;
   var command=new StringBuilder(Quote(program));foreach(string arg in args)command.Append(" ").Append(Quote(arg));
   env=Marshal.StringToHGlobalUni(environment+"\0\0");
   // Suspended assignment is mandatory. No breakaway flag and no launch-before-assignment race.
   if(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()>=startupDeadline)throw new InvalidOperationException("startup_deadline");
   Check(CreateProcess(program,command,IntPtr.Zero,IntPtr.Zero,true,0x4|0x400|0x80000|0x08000000,env,cwd,ref startup,out process),"create_suspended");
   Check(AssignProcessToJobObject(job,process.process),"assign_job");assigned=true;
   long birth,exit,kernel,user;Check(GetProcessTimes(process.process,out birth,out exit,out kernel,out user),"creation_identity");
   CloseHandle(outWrite);outWrite=IntPtr.Zero;CloseHandle(errWrite);errWrite=IntPtr.Zero;CloseHandle(input);input=IntPtr.Zero;
   stdout=Pump(outRead,"stdout");outRead=IntPtr.Zero;stderr=Pump(errRead,"stderr");errRead=IntPtr.Zero;
   long wrapperBirth;Check(GetProcessTimes(GetCurrentProcess(),out wrapperBirth,out exit,out kernel,out user),"wrapper_creation_identity");
   Emit("{\"type\":\"started\",\"pid\":"+process.pid+",\"creation_identity\":\""+birth+"\",\"wrapper_creation_identity\":\""+wrapperBirth+"\",\"job_name\":\"Local\\\\CoMath-"+nonce+"\"}");
   Check(ResumeThread(process.thread)!=0xffffffff,"resume_thread");
   if(interactive){
    inputQueue=new BlockingCollection<byte[]>(64);var queue=inputQueue;var writerHandle=inputWrite;inputWrite=IntPtr.Zero;
    inputWriter=Task.Run(delegate {try{using(var file=new FileStream(new SafeFileHandle(writerHandle,true),FileAccess.Write,16384,false)){
     foreach(var bytes in queue.GetConsumingEnumerable()){try{file.Write(bytes,0,bytes.Length);file.Flush();}finally{Interlocked.Add(ref queuedInputBytes,-bytes.Length);}}
    }}catch(IOException){}catch(ObjectDisposedException){} });
   }
   var controls=inputQueue;
   Task.Run(delegate {
    try{
     string cancelFrame="{\"type\":\"cancel\",\"nonce\":\""+nonce+"\"}";
     string closeFrame="{\"type\":\"stdin_close\",\"nonce\":\""+nonce+"\"}";
     string prefix="{\"type\":\"stdin\",\"nonce\":\""+nonce+"\",\"data\":\"";
     string line;
     while((line=Console.ReadLine())!=null){
      if(line==cancelFrame){cancelled=true;return;}
      if(line==closeFrame&&interactive){if(!controls.IsAddingCompleted)controls.CompleteAdding();continue;}
      if(interactive&&line.Length<=22000&&line.StartsWith(prefix,StringComparison.Ordinal)&&line.EndsWith("\"}",StringComparison.Ordinal)&&!controls.IsAddingCompleted){
       var encoded=line.Substring(prefix.Length,line.Length-prefix.Length-2);var bytes=Convert.FromBase64String(encoded);
       if(bytes.Length>16384||Convert.ToBase64String(bytes)!=encoded)throw new InvalidOperationException("stdin_frame");
       long size=Interlocked.Add(ref queuedInputBytes,bytes.Length);
       if(size>inputQueueBytes||!controls.TryAdd(bytes)){Interlocked.Add(ref queuedInputBytes,-bytes.Length);inputOverflow=true;cancelled=true;return;}
       continue;
      }
      protocolError=true;cancelled=true;return;
     }
     // Control pipe EOF is loss of the owning service, even after stdin_close.
     cancelled=true;
    }catch{protocolError=true;cancelled=true;}
   });
   var watch=System.Diagnostics.Stopwatch.StartNew();bool timedOut=false,terminated=false;long stopAt=0;
   while(true){ACCOUNT account;Check(QueryInformationJobObject(job,1,out account,(uint)Marshal.SizeOf(typeof(ACCOUNT)),IntPtr.Zero),"query_job");if(account.active==0)break;
    if(!terminated&&(cancelled||(timeout>0&&watch.ElapsedMilliseconds>=timeout))){timedOut=!cancelled;Check(TerminateJobObject(job,1),"terminate_job");terminated=true;stopAt=watch.ElapsedMilliseconds;}
    if(terminated&&watch.ElapsedMilliseconds-stopAt>stopTimeout)throw new InvalidOperationException("termination_unconfirmed");Thread.Sleep(10);
   }
   if(inputQueue!=null&&!inputQueue.IsAddingCompleted)inputQueue.CompleteAdding();
   if(!Task.WaitAll(new[]{stdout,stderr},stopTimeout))throw new InvalidOperationException("output_drain_unconfirmed");
   if(inputWriter!=null&&!inputWriter.Wait(stopTimeout))throw new InvalidOperationException("input_drain_unconfirmed");
   uint code;Check(GetExitCodeProcess(process.process,out code),"exit_code");
   Emit("{\"type\":\"completed\",\"exit_code\":"+code+",\"timed_out\":"+(timedOut?"true":"false")+",\"cancelled\":"+(cancelled?"true":"false")+",\"active_processes\":0,\"input_overflow\":"+(inputOverflow?"true":"false")+",\"protocol_error\":"+(protocolError?"true":"false")+",\"termination_confirmed\":true}");return 0;
  } catch(Exception error) {Emit("{\"type\":\"error\",\"code\":\"OWNED_JOB_FAILED\",\"message\":\""+error.GetType().Name+"\",\"termination_confirmed\":false}");return 1;}
  finally { if(process.process!=IntPtr.Zero&&!assigned)TerminateProcess(process.process,1);if(job!=IntPtr.Zero)CloseHandle(job);if(process.thread!=IntPtr.Zero)CloseHandle(process.thread);if(process.process!=IntPtr.Zero)CloseHandle(process.process);foreach(IntPtr handle in new[]{outRead,outWrite,errRead,errWrite,input,inputWrite})if(handle!=IntPtr.Zero&&handle!=new IntPtr(-1))CloseHandle(handle);if(attributes!=IntPtr.Zero){DeleteProcThreadAttributeList(attributes);Marshal.FreeHGlobal(attributes);}if(handles!=IntPtr.Zero)Marshal.FreeHGlobal(handles);if(env!=IntPtr.Zero)Marshal.FreeHGlobal(env); }
 }
}
'@
$environmentEntries = @($request.env.PSObject.Properties | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Value)" })
$environmentBlock = $environmentEntries -join [char]0
$exitCode = [CoMathOwnedJob]::Run([string]$request.program, [string[]]@($request.args), [string]$request.cwd, $environmentBlock, [string]$request.nonce, [long]$request.timeout_ms, [bool]($request.interactive -eq $true), [int]$request.stop_timeout_ms, [int]$request.input_queue_bytes, [long]$request.startup_deadline_ms)
exit $exitCode
