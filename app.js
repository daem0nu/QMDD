
const express = require('express');
const child_process = require('child_process')
const app = express()
app.use(express.json())
const port = 8888

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let users = {
    "admin": "admin",
    "user": "user",
    "guest": "guest",
    'hacker':'hacker'
}

let banned_users = ['hacker']
let p1=0;
// 你不准getflag
banned_users.push("admin")

let banned_users_regex = null;
function build_banned_users_regex() {
	let regex_string = ""
    for (let username of banned_users) {
        regex_string += "^" + escapeRegExp(username) + "$" + "|"
    }
    regex_string = regex_string.substring(0, regex_string.length - 1)
    banned_users_regex = new RegExp(regex_string, "g")
}

//鉴权中间件
function requireLogin(req, res, next) {
    let username = req.body.username
    let password = req.body.password
    let p1=0
    let p2=0
    if (!username || !password) {
        res.send("用户名或密码不能为空")
        return
    }
    if (typeof username !== "string" || typeof password !== "string") {
        res.send("用户名或密码不合法")
        return
    }
    // 基于正则技术的封禁用户匹配系统的设计与实现
    let test1 = banned_users_regex.test(username)
    console.log(`使用正则${banned_users_regex}匹配${username}的结果为：${test1}`)
    if (test1) {
		console.log("第一个判断匹配到封禁用户：",username)
        res.send("用户'"+username + "'被封禁，无法鉴权！")
        return
    }
    // 基于in关键字的封禁用户匹配系统的设计与实现
    let test2 = (username in banned_users)
    console.log(`使用in关键字匹配${username}的结果为：${test2}`)
    if (test2){
        console.log("第二个判断匹配到封禁用户：",username)
        res.send("用户'"+username + "'被封禁，无法鉴权！")
        return
    }
    if (username in users) {
        p1=1;
    }
    if (username == "admin") {
        p2=1;
    }
    if (username in users && users[username] === password) {
        next()
        return
    }
    res.send(`用户名或密码错误，鉴权失败！,p2=${p2}`)
}

function registerUser(username, password) {
    if (typeof username !== "string" || username.length > 20) {
        return "用户名不合法"
    }
    if (typeof password !== "string" || password.length > 20) {
        return "密码不合法"
    }
    if (username in users) {
        return "用户已存在"
    }

    for(let existing_user in users){
        let existing_user_password = users[existing_user]
        if (existing_user_password === password){
            return `您的密码已经被用户'${existing_user}'使用了，请使用其它的密码`
        }
    }

    users[username] = password
    return "注册成功"
}

app.use(express.static('public'))

// 每次请求前，更新封禁用户正则信息
app.use(function (req, res, next) {
    try {
        build_banned_users_regex()
		console.log("封禁用户正则表达式（满足这个正则表达式的用户名为被封禁用户名）：",banned_users_regex)
    } catch (e) {
    }
    next()
})

app.post("/api/register", (req, res) => {
    let username = req.body.username
    let password = req.body.password
    let message = registerUser(username, password)
    res.send(message)
})

app.post("/api/login", requireLogin, (req, res) => {
    res.send("登录成功！")
})

app.post("/api/flag", requireLogin, (req, res) => {
    let username = req.body.username
    if (username !== "admin") {
        res.send("登录成功，但是只有'admin'用户可以看到flag，你的用户名是'" + username + "'")
        return
    }
    let flag = child_process.execSync("cat flag").toString()
    res.end(flag)
    console.error("有人获取到了flag！为了保证题目的正常运行，将会重置靶机环境！")
    res.on("finish", () => {
        setTimeout(() => { process.exit(0) }, 1)
    })
    return
})

app.post('/api/ban_user', requireLogin, (req, res) => {
    let username = req.body.username
    let ban_username = req.body.ban_username
    if(!ban_username){
        res.send("ban_username不能为空")
        return
    }
    if(username === ban_username){
        res.send("不能封禁自己")
        return
    }
    for (let name of banned_users){
        if (name === ban_username) {
            res.send("用户已经被封禁")
            return
        }
    }
    banned_users.push(ban_username)
    res.send("封禁成功！")
})



app.get("/", (req, res) => {
    res.redirect("/static/index.html")
})

app.listen(port, () => {
    console.log(`listening on port ${port}`)
})