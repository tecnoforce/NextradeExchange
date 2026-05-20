# Task Completion

## Verification Steps After Coding Tasks

1. **Check for syntax errors**: Node.js will catch these on startup
2. **Restart dev server**: `npm run dev` (or let nodemon auto-reload)
3. **Verify in browser**: http://localhost:3000 — check affected pages
4. **Test API endpoints**: Use browser dev tools or curl/Postman

## No Formal Test/Lint Commands

- Project does NOT have: eslint, prettier, jest, or other test runners configured
- Playwright is installed but no test scripts defined in package.json
- Manual testing via browser is the primary verification method

## When Modifying Backend

- Watch server console for errors after nodemon restarts
- Check `data/nextrade.db` exists and is accessible
- Verify Socket.io connections work (browser dev tools → Network → WS)

## When Modifying Frontend

- Hard refresh browser (Ctrl+Shift+R) to bypass cache
- Check browser console for JS errors
- Verify Socket.io events fire correctly

## Database Changes

- If modifying Sequelize models, delete `data/nextrade.db` and re-run `npm run seed`
- Seed script recreates tables and demo data

## Final Checklist

- [ ] Server starts without errors
- [ ] Affected page loads correctly
- [ ] No console errors (browser + server)
- [ ] Socket.io real-time updates working (if applicable)
- [ ] API endpoints return expected data
