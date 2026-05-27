FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    wget \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=$ANDROID_SDK_ROOT
ENV PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/build-tools/34.0.0

RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools && \
    cd $ANDROID_SDK_ROOT/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip -O tools.zip && \
    unzip -q tools.zip && \
    mv cmdline-tools latest && \
    rm tools.zip && \
    chmod -R +x $ANDROID_SDK_ROOT/cmdline-tools/latest/bin

RUN yes | sdkmanager --sdk_root=$ANDROID_SDK_ROOT --licenses && \
    sdkmanager --sdk_root=$ANDROID_SDK_ROOT \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "platform-tools"

ENV GRADLE_HOME=/opt/gradle
ENV PATH=$PATH:$GRADLE_HOME/bin

RUN cd /opt && \
    wget -q https://services.gradle.org/distributions/gradle-8.5-bin.zip -O gradle.zip && \
    unzip -q gradle.zip && \
    mv gradle-8.5 gradle && \
    rm gradle.zip

# Copy Vite dist into assets
RUN mkdir -p /workspace/app/src/main/assets
COPY dist /workspace/app/src/main/assets/

# Copy Android project
COPY android/build.gradle /workspace/build.gradle
COPY android/settings.gradle /workspace/settings.gradle
COPY android/gradle.properties /workspace/gradle.properties
COPY android/app/build.gradle /workspace/app/build.gradle
COPY android/app/src/ /workspace/app/src/

WORKDIR /workspace

# Build DEBUG APK (auto-signed with debug keystore, installable directly)
RUN gradle assembleDebug --no-daemon --stacktrace