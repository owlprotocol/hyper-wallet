export PRIVATE_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
export REGISTRY=./registry
hyperlane core deploy --chain localhostmain -r $REGISTRY -k $PRIVATE_KEY -y
hyperlane core deploy --chain localhostremote -r $REGISTRY -k $PRIVATE_KEY -y        
LOG_LEVEL=debug hyperlane relayer -r $REGISTRY -k $PRIVATE_KEY --chains localhostmain,localhostremote
