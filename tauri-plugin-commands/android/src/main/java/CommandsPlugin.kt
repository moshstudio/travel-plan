package com.travel_plan.commands

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke

@InvokeArg
class PingArgs {
  var value: String? = null
}

@TauriPlugin
class CommandsPlugin(private val activity: Activity): Plugin(activity) {
    private val implementation = Commands(activity)

    @Command
    fun exitApp(invoke: Invoke) {
        implementation.exitApp()
        val ret = JSObject()
        invoke.resolve(ret)
    }
}
