1.install npm and node
2.Open Powershell on parent folder (I personally only built it on windows, but I think its very unlikely causing problems on a Linux system)
2.execute "npm run build" in command console to build a minified version of the webextension
3.execute "npm run serve" to build a not minified version of the webextension

notes: my code is in the src folder. The rest of the folders contains build code from https://github.com/Kocal/vue-web-extension
If anything goes wrong during build that github link contains a more detailed instruction on how to build that project.

Requirements:
Node.js >= 10 and npm >= 5
git
vue-cli 3+

I had to enable $env:NODE_OPTIONS = "--openssl-legacy-provider" on my local machine for it to build correctly.