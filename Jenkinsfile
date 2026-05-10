pipeline {
    agent any

    tools {
        nodejs 'Node18'
    }

    triggers {
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
                sh 'npx electron-builder --linux AppImage --publish never'
            }
        }

        stage('Archive') {
            steps {
                echo 'Archiving build artifacts...'
                archiveArtifacts artifacts: 'dist/*.AppImage', fingerprint: true
            }
        }
    }

    post {
        success {
            echo '✅ Build successful! NexTerm AppImage is ready.'
        }
        failure {
            echo '❌ Build failed. Check Console Output for details.'
        }
        always {
            cleanWs()
        }
    }
}