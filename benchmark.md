Details for 600.000 messages per second benchmark.

Environment : Azure Cloud, Ubuntu 12.04 LTS 64bit servers
Host - Servers : 2 x 2 cores servers (clustered)
Client - Servers : 2 x 2 cores, 2 x 4 cores

Server Application: chat sample (sample folder)
Client Application: socket test (JavaClient / test folder)

1 x 2 cores + 1 x 4 cores client servers hit to first server
1 x 2 cores + 1 x 4 cores client servers hit to second server

2000 concurrent clients / 600K messages per second in avarage

We run the test for ~24 hours / total ~50 Billion messages sent



