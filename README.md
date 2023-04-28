# ragic-docker
Dockerhub: https://hub.docker.com/r/modagovtw/ragic
## Docker compose
```
docker-compose up -d 
```

## Kubernetes
本範例為GKE環境，並使用Ingress放SSL憑證。
```
kubectl create secret tls cert-ragic --cert=$CERT_PATH --key=$KEY_PATH
export DOMAIN=ragic.example.com
envsubst < gke.yml | kubectl apply -f -
```
或使用helm

```
helm repo add moda https://moda-gov-tw.github.io/helm-charts
helm install ragic moda/ragic
```
