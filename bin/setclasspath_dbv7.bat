rem Make sure prerequisite environment variables are set
if not "%JAVA_HOME%" == "" goto gotJdkHome
if not "%JRE_HOME%" == "" goto gotJreHome
echo Neither the JAVA_HOME nor the JRE_HOME environment variable is defined
echo At least one of these environment variable is needed to run this program
goto exit

:gotJreHome
if not exist "%JRE_HOME%\bin\java.exe" goto noJavaHome
if not exist "%JRE_HOME%\bin\javaw.exe" goto noJavaHome
goto exit

:gotJdkHome
if not exist "%JAVA_HOME%\bin\java.exe" goto noJavaHome
if not exist "%JAVA_HOME%\bin\javaw.exe" goto noJavaHome
if not exist "%JAVA_HOME%\bin\jdb.exe" goto noJavaHome
if not exist "%JAVA_HOME%\bin\javac.exe" goto noJavaHome
if not "%JRE_HOME%" == "" goto okJavaHome
set "JRE_HOME=%JAVA_HOME%"
goto okJavaHome

:noJavaHome
echo The JAVA_HOME environment variable is not defined correctly
echo This environment variable is needed to run this program
echo NB: JAVA_HOME should point to a JDK not a JRE
goto exit
:okJavaHome

if not "%BASEDIR%" == "" goto gotBasedir
echo The BASEDIR environment variable is not defined
echo This environment variable is needed to run this program
goto exit
:gotBasedir
if exist "%BASEDIR%\bin\setclasspath_dbv7.bat" goto okBasedir
echo The BASEDIR environment variable is not defined correctly
echo This environment variable is needed to run this program
goto exit
:okBasedir

rem Set standard command for invoking Java.
rem Note that NT requires a window name argument when using start.
rem Also note the quoting as JAVA_HOME may contain spaces.
set _RUNJAVA="%JRE_HOME%\bin\java"
set _RUNJDB="%JAVA_HOME%\bin\jdb"
set CLASSPATH=lib/db/je7/*;lib/jetty9.4/*;lib/jetty9.4/annotations/*;lib/jetty9.4/apache-jsp/*;lib/jetty9.4/http2/*;lib/jetty9.4/transactions/*;lib/jetty9.4/websocket/*;lib/*;lib/poi/*;lib/jfree/*;lib/google-api-client/*;lib/stripe/*;lib/ZXing/*;lib/aws/*;lib/dropbox/*;lib/sso/*;lib/sso/opensaml/*;.
goto end

:exit
exit /b 1

:end
exit /b 0
