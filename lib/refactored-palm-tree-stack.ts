import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';


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
        "VECTOR_BUCKET": vectorBucket.bucketName
      }
    })

    vectorFunction.addEventSource(new eventsources.S3EventSource(sourceBucket, {
      events: [s3.EventType.OBJECT_CREATED]
    }))

    const vectorFunctionRole = vectorFunction.role!
    vectorFunctionRole.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"))

  }
}
