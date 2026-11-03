        stage('Deploy to Stage') {
            steps {
                sh '''
                    set -e
                    # Update image tag inside manifest
                    sed -i "s|image: .*|image: ${IMAGE_URI}|g" deployment.yml
                    
                    # Apply configurations to bms-stage
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
                    # Apply identical manifest config to bms-prod
                    kubectl apply -f deployment.yml -n bms-prod
                    kubectl apply -f service.yml -n bms-prod
                '''
            }
        }

        stage('Validate Production') {
            steps {
                sh '''
                    set -e
                    kubectl get all -n bms-prod
                    kubectl rollout status deployment/bookmyshow -n bms-prod --timeout=180s
                '''
            }
        }
