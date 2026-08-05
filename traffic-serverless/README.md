# Traffic Check — serverless backend

AWS backend for the Traffic Check app. Built with AWS SAM (Lambda + API Gateway,
DynamoDB coming next).

## Prerequisites (one-time)

1. An AWS account: https://aws.amazon.com/free
2. AWS CLI installed, then run `aws configure` (paste an IAM user's access key).
3. AWS SAM CLI installed: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
4. Node.js (already installed).

## Deploy

```bash
sam build
sam deploy --guided     # first time only; answer the prompts, accept defaults
```

When it finishes, it prints an `ApiUrl`. Test it:

```bash
curl <ApiUrl>/hello
# -> {"message":"Hello from AWS Lambda 👋"}
```

## Tear down (stop all costs)

```bash
sam delete
```

## Roadmap

- [x] 1. Foundation — hello Lambda + API Gateway
- [ ] 2. DynamoDB + save/read user preferences
- [ ] 3. Google OAuth (connect calendar)
- [ ] 4. Daily worker — Calendar -> Maps -> DynamoDB
- [ ] 5. Scheduling (EventBridge)
- [ ] 6. Send the message
- [ ] 7. Wire up the Android app
