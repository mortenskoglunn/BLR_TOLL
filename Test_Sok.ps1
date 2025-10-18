$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJmdWxsTmFtZSI6IlN5c3RlbSBBZG1pbmlzdHJhdG9yIiwiaWF0IjoxNzU3NjgwNzE2LCJleHAiOjE3NTc3NjcxMTZ9.R0LJK35fxadNjmL3xm0H916wJhuzleG6sxSxhhx-OY4"

Invoke-RestMethod -Uri "http://localhost:5000/api/database/search?blomst=rose" -Headers @{"Authorization"="Bearer $token"}