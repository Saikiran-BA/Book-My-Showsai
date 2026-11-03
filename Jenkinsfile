        stage('Deploy to Stage') {
            steps {
                sh '''
                    set -e
                    # Dynamically inject the newly built image URI into the deployment manifest
                    sed -i "s|image: .*|image: ${IMAGE_URI}|g" deployment.yml
                    
                    # Apply the Kubernetes configurations to the stage namespace
                    kubectl apply -f deployment.yml -n bms-stage
                    kubectl apply -f service.yml -n bms-stage
                '''
            }
        }

        stage('Validate Stage') {
            steps {
                sh '''
                    set -e
                    kubectl get all -n bms-stage
                    kubectl rollout status deployment/bookmyshow -n bms-stage --timeout=180s
                '''
            }
        }

        stage('Deploy Same Image to Production') {
            steps {
                sh '''
                    set -e
                    # Apply the same updated configuration to the production namespace
                    kubectl apply -f deployment.yml -n bms-prod
                    kubectl apply -f service.yml -n bms-prod
                '''
            }
        }
