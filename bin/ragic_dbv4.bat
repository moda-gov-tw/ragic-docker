@echo off
rem Guess RAGIC_HOME if not defined
set "CURRENT_DIR=%cd%"
if not "%RAGIC_HOME%" == "" goto gotHome
set "RAGIC_HOME=%CURRENT_DIR%"
if exist "%RAGIC_HOME%\bin\ragic_dbv4.bat" goto okHome
cd ..
set "RAGIC_HOME=%cd%"
:gotHome
if exist "%RAGIC_HOME%\bin\ragic_dbv4.bat" goto okHome
echo The RAGIC_HOME environment variable is not defined correctly
echo This environment variable is needed to run this program
goto end
:okHome
cd "%RAGIC_HOME%"

rem Ensure that any user defined CLASSPATH variables are not used on startup,
rem but allow them to be specified in setenv.bat, in rare case when it is needed.
set CLASSPATH=

rem Get standard Java environment variables
if exist "%RAGIC_HOME%\bin\setclasspath_dbv4.bat" goto okSetclasspath
echo Cannot find "%RAGIC_HOME%\bin\setclasspath_dbv4.bat"
echo This file is needed to run this program
goto end
:okSetclasspath
set "BASEDIR=%RAGIC_HOME%"
call "%RAGIC_HOME%\bin\setclasspath_dbv4.bat" %1
if errorlevel 1 goto end

rem ----- Execute The Requested Command ---------------------------------------

echo Using RAGIC_HOME:  "%RAGIC_HOME%"
echo Using JRE_HOME:    "%JRE_HOME%"
echo Using JAVA_HOME:   "%JAVA_HOME%"

set _EXECJAVA=%_RUNJAVA%
set MAINCLASS=com.ragic.s3.nui.RagicJetty9Server
set ACTION=start

if ""%1"" == ""run"" goto doRun
if ""%1"" == ""start"" goto doStart
if ""%1"" == ""stop"" goto doStop

echo Usage:  ragic ( commands ... )
echo commands:
echo   run               Start Ragic in the current window
echo   start             Start Ragic in a separate window
rem echo   stop              Stop Ragic
goto end

:doRun
goto execCmd

:doStart
shift
if not "%OS%" == "Windows_NT" goto noTitle
if "%TITLE%" == "" set TITLE=Ragic
set _EXECJAVA=start "%TITLE%" %_RUNJAVA%
goto gotTitle
:noTitle
set _EXECJAVA=start %_RUNJAVA%
:gotTitle
goto execCmd

:doStop
shift
set ACTION=stop
goto execCmd


:execCmd
set JAVA_OPTS=-Xms5g -Xmx5g -XX:+DoEscapeAnalysis -XX:+UseCompressedOops -Dfile.encoding=UTF-8 -Duser.timezone=UTC -Duser.language=en -server -Dhttps.protocols=TLSv1.1,TLSv1.2 -Dsun.zip.disableMemoryMapping=true

rem Execute Java with the applicable properties
:::exeLoop
::set JPID=-1
::for /F "tokens=1" %%i in ('jps -lv ^| find "%MAINCLASS%"') do ( set JPID=%%i )
::if %JPID%==-1 (

echo %_EXECJAVA% %JAVA_OPTS% -classpath "%CLASSPATH%" -Dragic.home="%RAGIC_HOME%" %MAINCLASS%
%_EXECJAVA% %JAVA_OPTS% -classpath "%CLASSPATH%" -Dragic.home="%RAGIC_HOME%" %MAINCLASS%


::ping 127.0.0.1 -n 2 -w 1000 > nul
::)
::goto exeLoop