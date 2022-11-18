#!/bin/sh -l
#Check if Ragic process already exists
CHECK_RESULT=`ps -ef | grep 'java' | grep 'ragic'`
if [ "$CHECK_RESULT" ]; then
	echo "Ragic process already exists."
	exit 0;
fi

SCRIPT_PATH=$1
SCRIPT="";
echo "SCRIPT_PATH=$1";
#Check if script exists
if [ $SCRIPT_PATH ] && [ -e ${SCRIPT_PATH} ]; then
	SCRIPT=${SCRIPT_PATH};
	echo "SCRIPT=$SCRIPT";
elif [ -e "${RAGIC_HOME}/bin/checkragic.sh" ]; then
	echo "Cannot find script file ${SCRIPT_PATH}, use default setting instead.";
	SCRIPT="${RAGIC_HOME}/bin/ragic.sh"
	echo "SCRIPT=$SCRIPT";
else 
	echo "Init SCRIPT failed. SCRIPT_PATH="${SCRIPT_PATH}", RAGIC_HOME=${RAGIC_HOME}";
	exit 1;
fi

#Execute script
nohup ${SCRIPT} manual &
