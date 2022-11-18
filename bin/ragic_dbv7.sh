#!/bin/sh -l


# Auto detect Java installation dir
# You can also use the following command if the default is not working on your MacOS.
# JAVA_HOME="$(/usr/libexec/java_home -v 1.8)"
JAVA_WHICH=`which java`
JAVA_HOME="$(dirname $(dirname $(readlink -f ${JAVA_WHICH})))"

# If you know where your Java home is, you can add it directly here
# JAVA_HOME=/usr/lib/jvm/java-7-oracle


# OS Language configurations
LC_CTYPE=en_US.UTF-8
LANG=en_US.UTF-8

# Following command would not work on MacOS, but would be needed if your server will open tons of files
# ulimit -Hn 500000
# ulimit -Sn 500000


### BEGIN INIT INFO
# Provides:          ragic
# Required-Start:    $network
# Required-Stop:
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Ragic Builder Service (https://www.ragic.com)
# Description:       Ragic Builder Service (https://www.ragic.com)
### END INIT INFO

# OS specific support.  $var _must_ be set to either true or false.
cygwin=false
os400=false
darwin=false
case "`uname`" in
CYGWIN*) cygwin=true;;
OS400*) os400=true;;
Darwin*) darwin=true;;
esac

# resolve links - $0 may be a softlink
PRG="$0"

while [ -h "$PRG" ]; do
  ls=`ls -ld "$PRG"`
  link=`expr "$ls" : '.*-> \(.*\)$'`
  if expr "$link" : '/.*' > /dev/null; then
    PRG="$link"
  else
    PRG=`dirname "$PRG"`/"$link"
  fi
done

# Get standard environment variables
PRGDIR=`dirname "$PRG"`

# Only set RAGIC_HOME if not already set
[ -z "$RAGIC_HOME" ] && RAGIC_HOME=`cd "$PRGDIR/.." >/dev/null; pwd`

# Ensure that any user defined CLASSPATH variables are not used on startup
CLASSPATH=

# For Cygwin, ensure paths are in UNIX format before anything is touched
if $cygwin; then
  [ -n "$JAVA_HOME" ] && JAVA_HOME=`cygpath --unix "$JAVA_HOME"`
  [ -n "$JRE_HOME" ] && JRE_HOME=`cygpath --unix "$JRE_HOME"`
  [ -n "$RAGIC_HOME" ] && RAGIC_HOME=`cygpath --unix "$RAGIC_HOME"`
  [ -n "$RAGIC_BASE" ] && RAGIC_BASE=`cygpath --unix "$RAGIC_BASE"`
  [ -n "$CLASSPATH" ] && CLASSPATH=`cygpath --path --unix "$CLASSPATH"`
fi

# For OS400
if $os400; then
  # Set job priority to standard for interactive (interactive - 6) by using
  # the interactive priority - 6, the helper threads that respond to requests
  # will be running at the same priority as interactive jobs.
  COMMAND='chgjob job('$JOBNAME') runpty(6)'
  system $COMMAND

  # Enable multi threading
  export QIBM_MULTI_THREADED=Y
fi

# Get standard Java environment variables
if $os400; then
  # -r will Only work on the os400 if the files are:
  # 1. owned by the user
  # 2. owned by the PRIMARY group of the user
  # this will not work if the user belongs in secondary groups
  BASEDIR="$RAGIC_HOME"
  . "$RAGIC_HOME"/bin/setclasspath_dbv7.sh
else
  if [ -r "$RAGIC_HOME"/bin/setclasspath_dbv7.sh ]; then
    BASEDIR="$RAGIC_HOME"
    . "$RAGIC_HOME"/bin/setclasspath_dbv7.sh
  else
    echo "Cannot find $RAGIC_HOME/bin/setclasspath_dbv7.sh"
    echo "This file is needed to run this program"
    exit 1
  fi
fi

# Add on extra jar files to CLASSPATH
if [ ! -z "$CLASSPATH" ] ; then
  CLASSPATH="$CLASSPATH":
fi

if [ -z "$RAGIC_BASE" ] ; then
  RAGIC_BASE="$RAGIC_HOME"
fi

if [ -z "$JAVA_OPTS" ] ; then
  JAVA_OPTS="-Xms5g -Xmx5g -XX:+UseG1GC -XX:+UseCompressedOops -Dfile.encoding=UTF-8 -Duser.timezone=UTC -Duser.language=en -server -Dhttps.protocols=TLSv1.1,TLSv1.2 -Dsun.zip.disableMemoryMapping=true"
fi

if [ -z "$RAGIC_OUT" ] ; then
  RAGIC_OUT="$RAGIC_BASE"/log/ragic.out
fi

if [ -z "$RAGIC_TMPDIR" ] ; then
  # Define the java.io.tmpdir to use for Ragic
  RAGIC_TMPDIR="$RAGIC_BASE"/temp
fi

# When no TTY is available, don't output to console
have_tty=0
if [ "`tty`" != "not a tty" ]; then
    have_tty=1
fi

# For Cygwin, switch paths to Windows format before running java
if $cygwin; then
  JAVA_HOME=`cygpath --absolute --windows "$JAVA_HOME"`
  JRE_HOME=`cygpath --absolute --windows "$JRE_HOME"`
  RAGIC_HOME=`cygpath --absolute --windows "$RAGIC_HOME"`
  RAGIC_BASE=`cygpath --absolute --windows "$RAGIC_BASE"`
  RAGIC_TMPDIR=`cygpath --absolute --windows "$RAGIC_TMPDIR"`
  CLASSPATH=`cygpath --path --windows "$CLASSPATH"`
fi

# ----- Execute The Requested Command -----------------------------------------

cd $RAGIC_HOME

# only output this if we have a TTY
if [ $have_tty -eq 1 ]; then
  echo "Using RAGIC_BASE:   $RAGIC_BASE"
  echo "Using RAGIC_HOME:   $RAGIC_HOME"
  echo "Using RAGIC_TMPDIR: $RAGIC_TMPDIR"
  echo "Using JAVA_HOME:    $JAVA_HOME"
  echo "Using JRE_HOME:     $JRE_HOME"
  echo "Using CLASSPATH:    $CLASSPATH"
fi

if [ "$1" = "start" ]; then

    eval \"$_RUNJAVA\" $JAVA_OPTS \
      -classpath \"$CLASSPATH\" \
      -Dragic.base=\"$RAGIC_BASE\" \
      -Dragic.home=\"$RAGIC_HOME\" \
      -Djava.io.tmpdir=\"$RAGIC_TMPDIR\" \
      com.ragic.s3.nui.RagicJetty9Server

elif [ "$1" = "test" ] ; then

    echo \"$_RUNJAVA\" $JAVA_OPTS \
      -classpath \"$CLASSPATH\" \
      -Dragic.base=\"$RAGIC_BASE\" \
      -Dragic.home=\"$RAGIC_HOME\" \
      -Djava.io.tmpdir=\"$RAGIC_TMPDIR\" \
      com.ragic.s3.nui.RagicJetty9Server

elif [ "$1" = "manual" ] ; then

  if [ ! -z "$RAGIC_PID" ]; then
    if [ -f "$RAGIC_PID" ]; then
      echo "PID file ($RAGIC_PID) found. Is Ragic still running? Start aborted."
      exit 1
    fi
  fi

  shift
  touch "$RAGIC_OUT"

  STATUS=0
  while [ $STATUS -eq 0 ]
  do

    eval \"$_RUNJAVA\" $JAVA_OPTS \
      -classpath \"$CLASSPATH\" \
      -Dragic.base=\"$RAGIC_BASE\" \
      -Dragic.home=\"$RAGIC_HOME\" \
      -Djava.io.tmpdir=\"$RAGIC_TMPDIR\" \
      com.ragic.s3.nui.RagicJetty9Server \
      >> "$RAGIC_OUT" 2>&1

    STATUS=$?

  done

  if [ ! -z "$RAGIC_PID" ]; then
    echo $! > $RAGIC_PID
  fi

else

  echo "Usage: ragic.sh ( commands ... )"
  echo "commands:"
  echo "  manual               Manually start Ragic in the current window"
  exit 1

fi
