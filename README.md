# ragic-docker

## Docker compose
```
docker-compose up -d 
```

## Kubernetes
新增 Ingress 用的 SSL 憑證，修改 gke.yml 中 $DOMAIN 為目標網域
```
kubectl apply -f gke.yml
```