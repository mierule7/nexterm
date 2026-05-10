pipeline {
    agent any

    tools {
        nodejs 'Node18'
    }

    triggers {
        // Check GitHub every 5 minutes
        pollSCM('H/5 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Pulling latest code from GitHub...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing npm packages...'
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                echo 'Building NexTerm...'
                sh 'npx electron-builder --linux --publish never'
            }
        }
    }

    post {
        success {
            echo '✅ Build successful!'
            archiveArtifacts artifacts: 'dist/*.AppImage, dist/*.deb', fingerprint: true
        }
        failure {
            echo '❌ Build failed. Check Console Output for details.'
        }
        always {
            cleanWs()
        }
    }
}