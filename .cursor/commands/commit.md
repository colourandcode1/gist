# Commit and Deploy

This command stages all local changes, commits them to git, pushes to GitHub, and deploys to Firebase hosting so the changes are available online.

## Steps:

1. **Check for uncommitted changes:**
   - Run: `git status` to see if there are any changes to commit
   - If there are no changes, inform the user and stop execution

2. **Stage all changes:**
   - Run: `git add .` to stage all modified, new, and deleted files

3. **Commit changes:**
   - If the user provided a commit message, use it
   - Otherwise, prompt the user for a commit message or use: "Deploy changes"
   - Run: `git commit -m "<commit message>"`

4. **Push to GitHub:**
   - Run: `git push` to push the committed changes to the remote repository
   - If this fails (e.g., no upstream branch), inform the user and stop execution

5. **Build and deploy to Firebase:**
   - Run: `npm run deploy` which executes `npm run build && firebase deploy --only hosting`
   - This will build the Vite application and deploy it to Firebase hosting

## Error Handling:

- If any step fails, stop execution immediately and report the error to the user
- Do not proceed to the next step if the previous step failed
- Provide clear error messages indicating which step failed and why

## Success Message:

After successful completion, inform the user that:
- Changes have been committed and pushed to GitHub
- The application has been built and deployed to Firebase
- The changes should now be live online

