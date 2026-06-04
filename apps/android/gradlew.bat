@rem VLUE Android — Gradle Wrapper (Windows)
@if "%DEBUG%"=="" @echo off

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome
set JAVA_HOME=
for %%i in (java.exe) do set JAVA_EXE=%%~$PATH:i
goto execute

:findJavaFromJavaHome
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

:execute
if not exist "%JAVA_EXE%" (
  echo ERROR: JAVA_HOME is not set or java.exe not found.
  echo Install Android Studio or set JAVA_HOME to JDK 17+.
  exit /b 1
)

set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar

"%JAVA_EXE%" %DEFAULT_JVM_OPTS% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
exit /b %ERRORLEVEL%
