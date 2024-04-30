#!/bin/bash
sysctl vm.overcommit_memory=1
redis-server /usr/local/etc/redis/redis.conf --bind redis --port 6379