# magic-node-bridge-proxy

Install project on the bridge server (must be accessible from the two parts)
```
npm install
```
then
```
node bridge-server.js
```


Install project on the private network (must have access to public bridge server)

```
npm install
```
then :

```
BRIDGE_PROXY_URL=https://bridge-server-instance.com node private-network-worker.js 
```

on windows:
```
set BRIDGE_PROXY_URL=https://bridge-server-instance.com && node private-network-worker.js
```


## Usage

```
curl https://bridge-server-instance.com/https://api.github.com/users/vvanghelue
```

You can post data too :
```
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"username":"xyz","password":"xyz"}' \
  https://bridge-server-instance.com/http://website.com/some/form
```




