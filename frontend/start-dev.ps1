$logPath = "D:\Genlayer\ProofBounty\frontend\dev-server.log"
"Starting ProofBounty dev server at $(Get-Date -Format o)" | Set-Content -LiteralPath $logPath
Set-Location -LiteralPath "D:\Genlayer\ProofBounty\frontend"
& "C:\Program Files\nodejs\npm.cmd" run dev -- -p 3030 *>&1 | Tee-Object -FilePath $logPath -Append
