pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        AWS_REGION     = 'ap-south-1'
        ECR_REPOSITORY = 'bookmyshow'
        EKS_CLUSTER    = 'bookmyshow-cluster'
        APP_NAME       = 'bookmyshow'
        IMAGE_TAG      = "${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Tools') {
            steps {
                sh '''
                    set -e
                    git --version
                    docker --version
                    aws --version
                    kubectl version --client
                    ansible --version
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('bookmyshow-app') {
                    sh '''
                        set -e
                        npm ci
                    '''
                }
            }
        }

        stage('Test') {
            steps {
                dir('bookmyshow-app') {
                    sh '''
                        set +e
                        npm test -- --watchAll=false
                        TEST_STATUS=$?

                        if [ "$TEST_STATUS" -ne 0 ]; then
                            echo "Tests failed or no compatible test script exists."
                            exit "$TEST_STATUS"
                        fi
                    '''
                }
            }
        }

        stage('Build Application') {
            steps {
                dir('bookmyshow-app') {
                    sh '''
                        set -e
                        npm run build
                    '''
                }
            }
        }

        stage('Resolve ECR URI') {
            steps {
                script {
                    env.AWS_ACCOUNT_ID = sh(
                        script: "aws sts get-caller-identity --query Account --output text",
                        returnStdout: true
                    ).trim()

                    env.ECR_REGISTRY =
                        "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"

                    env.IMAGE_URI =
                        "${env.ECR_REGISTRY}/${env.ECR_REPOSITORY}:${env.IMAGE_TAG}"
                }

                sh '''
                    set -e

                    aws ecr describe-repositories \
                      --repository-names "$ECR_REPOSITORY" \
                      --region "$AWS_REGION" >/dev/null 2>&1 \
                    || aws ecr create-repository \
                      --repository-name "$ECR_REPOSITORY" \
                      --region "$AWS_REGION"
                '''
            }
        }

        stage('Docker Build') {
            steps {
                dir('bookmyshow-app') {
                    sh '''
                        set -e
                        docker build -t "$IMAGE_URI" .
                    '''
                }
            }
        }

        stage('Trivy Scan') {
            steps {
                sh '''
                    set -e

                    if command -v trivy >/dev/null 2>&1; then
                        trivy image \
                          --severity HIGH,CRITICAL \
                          --exit-code 0 \
                          "$IMAGE_URI"
                    else
                        echo "Trivy is not installed; scan skipped for this lab."
                    fi
                '''
            }
        }

        stage('Push to ECR') {
            steps {
                sh '''
                    set -e

                    aws ecr get-login-password --region "$AWS_REGION" |
                    docker login \
                      --username AWS \
                      --password-stdin "$ECR_REGISTRY"

                    docker push "$IMAGE_URI"
                '''
            }
        }

        stage('Configure EKS') {
            steps {
                sh '''
                    set -e

                    aws eks update-kubeconfig \
                      --region "$AWS_REGION" \
                      --name "$EKS_CLUSTER"

                    kubectl get nodes
                '''
            }
        }

        stage('Deploy to Stage') {
            steps {
                sh '''
                    set -e

                    ansible-playbook ansible/deploy.yml \
                      -e target_environment=stage \
                      -e image_uri="$IMAGE_URI"
                '''
            }
        }

        stage('Validate Stage') {
            steps {
                sh '''
                    set -e

                    kubectl get all -n bms-stage
                    kubectl rollout status \
                      deployment/bookmyshow \
                      -n bms-stage \
                      --timeout=180s
                '''
            }
        }

        stage('Deploy Same Image to Production') {
            steps {
                sh '''
                    set -e

                    ansible-playbook ansible/deploy.yml \
                      -e target_environment=prod \
                      -e image_uri="$IMAGE_URI"
                '''
            }
        }

        stage('Validate Production') {
            steps {
                sh '''
                    set -e

                    kubectl get all -n bms-prod
                    kubectl rollout status \
                      deployment/bookmyshow \
                      -n bms-prod \
                      --timeout=180s
                '''
            }
        }
    }

    post {
        success {
            echo "Deployment completed successfully: ${IMAGE_URI}"
        }

        failure {
            echo "Pipeline failed. Checking Kubernetes status."

            sh '''
                kubectl get pods -A || true
                kubectl describe deployment bookmyshow -n bms-stage || true
                kubectl describe deployment bookmyshow -n bms-prod || true
            '''
        }

        always {
            sh '''
                docker image rm "$IMAGE_URI" >/dev/null 2>&1 || true
            '''
        }
    }
}
