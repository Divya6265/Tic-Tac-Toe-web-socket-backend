
const { createServer } = require("http")
const express = require('express')
const { Server } = require('socket.io')

const app = express()
const httpserver = createServer(app)

const allusers = {}
const allrooms = []

const io = new Server(httpserver, {
    cors: "http://localhost:5173/"
    // cors: "https://tic-tac-toe-web-socket-frontend.vercel.app/"
})

io.on("connection", (socket) => {
    console.log(socket.id)
    allusers[socket.id] = {
        socket: socket,
        online: true,
        playing: false
    }

    socket.on("request_to_play", (data) => {
        const currentPlayer = allusers[socket.id]
        currentPlayer.PlayerName = data.PlayerName

        let opponentPlayer;

        for (const key in allusers) {
            const user = allusers[key];
            if (user.online && !user.playing && key !== socket.id) {
                // gives opponents socket key and values
                console.log(key, "key")
                opponentPlayer = user
                allusers[key].playing = true
                break;
            }
        }
        if (opponentPlayer) {
            allrooms.push({
                player1: currentPlayer,
                player2: opponentPlayer
            })
            currentPlayer.socket.emit("OpponentFound", {
                currentPlayer: currentPlayer.PlayerName,
                OpponentName: opponentPlayer.PlayerName
            })

            opponentPlayer.socket.emit("OpponentFound", {
                currentPlayer: currentPlayer.PlayerName,
                OpponentName: currentPlayer.PlayerName
            })

            currentPlayer.socket.on("playerMoveFromClient", (data) => {
                opponentPlayer.socket.emit("playerMoveFromServer", {
                    ...data
                }) 
            })

            opponentPlayer.socket.on("playerMoveFromClient", (data) => {
                currentPlayer.socket.emit("playerMoveFromServer", {
                    ...data
                })
            })
            
        } else {
            currentPlayer.socket.emit("OpponentNotFound", {
                OpponentName: null
            })
        }
    })

    socket.on("disconnect", () => {
        if (allusers[socket.id]) {
            allusers[socket.id].online = false
            allusers[socket.id].playing = false 
        }
        for (let index = 0; index < allrooms.length; index++) {
            const { player1, player2 } = allrooms[index];
            if (player1.socket.id === socket.id) {
                player2.socket.emit("opponentLeftTheRoom", {
                    opponentLeft: true
                })
                break
            }
            if (player2.socket.id === socket.id) {
                player1.socket.emit("opponentLeftTheRoom", {
                    opponentLeft: true
                })
                break
            }

        }
    })

    socket.on("request_to_replay", () => {
        for (let index = 0; index < allrooms.length; index++) {
            const { player1, player2 } = allrooms[index];
            if (player1.socket.id === socket.id) {
                player2.socket.emit("accept_or_Denai", {
                    rematchRequested: true
                })
                player2.socket.on("accept_or_Denai_respo", (data) => {
                    player1.socket.emit("reset_game", {
                        currentPlayer : player1.PlayerName,
                        responce : data.responce
                    })
                    player2.socket.emit("reset_game", {
                        currentPlayer : player1.PlayerName,
                        responce : data.responce
                    })
                })
                break
            } else {
                player1.socket.emit("accept_or_Denai", {
                    rematchRequested: true
                })
                player1.socket.on("accept_or_Denai_respo", (data) => {
                    player1.socket.emit("reset_game", {
                        currentPlayer : player2.PlayerName,
                        responce : data.responce
                    })
                    player2.socket.emit("reset_game", {
                        currentPlayer : player2.PlayerName,
                        responce : data.responce
                    })
                })
                break
            }

        }
    })
})


httpserver.listen(8000, () => {
    console.log("server is up and running on port number", 8000)
})

