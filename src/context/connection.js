import { io } from 'socket.io-client'
import { of, fromEvent, Subject } from 'rxjs'
import { map, switchMap, takeUntil } from 'rxjs/operators'
import { createContext } from 'react'

console.log(import.meta.env)
const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000', {
  autoConnect: false,
})

const focusObs = new Subject()

export const connect = {
  socket,
  socket$: of(socket),
  connect$: null,
  focus: focusObs,
  emit: null,
  listen: null,
  setup: () => {
    connect.socket$ = of(socket)
    connect.connect$ = connect.socket$.pipe(
      switchMap((socket) =>
        fromEvent(socket, 'connect').pipe(map(() => socket))
      )
    )
    connect.emit = (observable, killObserver) => {
      return connect.connect$.pipe(
        switchMap((socket) =>
          observable.pipe(map((data) => ({ socket, data })))
        )
      )
    }
    // connect.listen = (event) => {
    //   return connect.connect$.pipe(
    //     switchMap((socket) => fromEvent(socket, event))
    //   )
    // }
    connect.listen = (event, killObserver) => {
      return connect.socket$.pipe(
        switchMap((socket) => fromEvent(socket, event)),
        takeUntil(killObserver)
      )
    }
    // connect.listen = (event) => {
    //   return connect.socket$.pipe(
    //     switchMap((socket) => fromEvent(socket, event))
    //   )
    // }
  },
}

export const ConnectionContext = createContext()
