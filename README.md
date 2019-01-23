# magic-node-bridge-proxy

On the private network (must have access to public bridge server)
```
BRIDGE_PROXY_URL=https://bridge-server-instance.com MIRRORED_ENDPOINT_URL=http://mirrored-endpoint.local node trojan-horse.js 
```

On the bridge server (must be accessible from the two parts)
```
node bridge-server.js
```