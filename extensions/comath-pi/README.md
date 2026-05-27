# CoMath Pi Extension

Runtime registration package for the CoMath Pi Lab thin client.

The extension declares commands, tools, resources, permission policy, and the
bounded Pi goal continuation contract. Trusted mathematical state remains owned
by `comathd`; this package must not write `.comath/` runtime state directly.
