
git pull
git rm --cached `git status | grep deleted | sed 's#^.*:##'`
git add *
git commit -m "automate commit"
git push -u origin master