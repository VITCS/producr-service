REM ECHO OFF
set ROOT=d:\infville\repos\product


cmd/c "cd %ROOT%\search\opensearch && sam build && sam deploy --config-env dev2 --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed

cmd/c "cd %ROOT%\model\product && sam build && sam deploy --config-env dev2 --no-confirm-changeset"
if %ERRORLEVEL% gtr 1 goto completed

:completed
echo %ERRORLEVEL%
cd %ROOT%
EXIT /B %ERRORLEVEL%

