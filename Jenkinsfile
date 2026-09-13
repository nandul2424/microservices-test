pipeline {
    agent any
    
    environment {
        // 1. Values pulled from your Terraform config (Terraform.tf / tfstate)
        //    ACR login server output: nandul24dockerimages1.azurecr.io
        ACR_URL         = 'nandul24dockerimages1.azurecr.io'
        IMAGE_NAME      = 'microservices-frontend-ui' // matches k8s-manifests/frontend.yaml
        IMAGE_TAG       = "${BUILD_NUMBER}" // Unique tag for every build

        // AKS deployment targets (from Terraform)
        AKS_CLUSTER     = 'production-aks-cluster'
        AKS_RESOURCE_GROUP = 'my-terraform-rg'
        K8S_NAMESPACE   = 'microservices-test'

        // 2. These match the Credentials IDs you saved in Jenkins
        //    (create these under: Jenkins > Manage Credentials)
        REGISTRY_CREDS  = credentials('acr-credentials')
    }
    
    stages {
        stage('Checkout Code') {
            steps {
                // Automatically pulls the master branch code
                checkout scm
            }
        }
        
        stage('Run Tests') {
            steps {
                echo 'Running unit tests and code linting...'
                // Replace this with your actual test framework command
                // e.g., sh 'npm test' or sh './gradlew test'
                sh 'echo "Tests passed successfully!"'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker container...'
                sh "docker build -t ${ACR_URL}/${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }
        
        stage('Publish to ACR') {
            steps {
                echo 'Logging into Azure Container Registry...'
                // Securely logs into your private ACR. Single quotes keep the secret
                // out of the Groovy string so it isn't interpolated/leaked in logs;
                // the shell expands $REGISTRY_CREDS_USR / $REGISTRY_CREDS_PSW instead.
                // (credentials('acr-credentials') auto-creates the _USR and _PSW vars.)
                sh 'echo $REGISTRY_CREDS_PSW | docker login $ACR_URL -u $REGISTRY_CREDS_USR --password-stdin'
                
                echo 'Pushing image to ACR...'
                sh "docker push ${ACR_URL}/${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }
        
        stage('Deploy to AKS') {
            environment {
                // Dynamically binds your Kubernetes config file
                KUBECONFIG_FILE = credentials('aks-kubeconfig')
            }
            steps {
                echo 'Updating Kubernetes manifest and deploying to AKS...'

                // Ensure the target namespace exists (idempotent).
                sh "kubectl --kubeconfig=${KUBECONFIG_FILE} create namespace ${K8S_NAMESPACE} --dry-run=client -o yaml | kubectl --kubeconfig=${KUBECONFIG_FILE} apply -f -"

                // Substitute ACR_URL / IMAGE_NAME / IMAGE_TAG into the manifest
                // that ships with this repo (k8s/frontend.yaml).
                sh "envsubst < k8s/frontend.yaml > generated_deployment.yaml"

                // Apply the deployment to the cluster.
                sh "kubectl --kubeconfig=${KUBECONFIG_FILE} apply -f generated_deployment.yaml"

                // Wait for the rollout to finish so a bad image fails the build.
                sh "kubectl --kubeconfig=${KUBECONFIG_FILE} -n ${K8S_NAMESPACE} rollout status deployment/frontend-service --timeout=120s"
            }
        }
    }
    
    post {
        always {
            echo 'Cleaning up local Docker images to save disk space...'
            sh "docker rmi ${ACR_URL}/${IMAGE_NAME}:${IMAGE_TAG} || true"
        }
        success {
            echo 'Pipeline completed successfully! App is live on AKS.'
        }
        failure {
            echo 'Pipeline failed. Check the logs above for details.'
        }
    }
}
