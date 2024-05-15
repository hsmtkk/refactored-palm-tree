import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class RefactoredPalmTreeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const sourceBucket = new s3.Bucket(this, "sourceBucket", {})

    const vectorBucket = new s3.Bucket(this, "vectorBucket", {})

    const vectorFunction = new lambda.Function(this, "vectorFunction", {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset("vector"),
      handler: "vector.handler",
      environment: {
        "OPENAI_API_KEY": "placeholder",
        "VECTOR_BUCKET": vectorBucket.bucketName,
      },

    })

    vectorFunction.addEventSource(new eventsources.S3EventSource(sourceBucket, {
      events: [s3.EventType.OBJECT_CREATED]
    }))

    const vectorFunctionRole = vectorFunction.role!
    vectorFunctionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"))

    const cluster = new ecs.Cluster(this, "cluster", {})

    const chatTask = new ecs.FargateTaskDefinition(this, "chatTask", {
      cpu: 256,
      memoryLimitMiB: 512,
    })

    chatTask.addContainer("chatContainer", {
      image: ecs.ContainerImage.fromAsset("chat"),
      environment: {
        "OPENAI_API_KEY": "placeholder",
        "VECTOR_BUCKET": vectorBucket.bucketName,
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "chat",
      }),
      portMappings: [{ containerPort: 8000 }],
    })

    const chatService = new ecs.FargateService(this, "chatService", {
      cluster: cluster,
      taskDefinition: chatTask,
    })

    const loadBalancher = new elbv2.ApplicationLoadBalancer(this, "loadBalancer", {
      vpc: cluster.vpc,
      internetFacing: true,
    })

    const listener = loadBalancher.addListener("listener", { port: 80 })

    const targetGroup = listener.addTargets("targetGroup", {
      port: 8000,
      targets: [chatService]
    })
  }
}
