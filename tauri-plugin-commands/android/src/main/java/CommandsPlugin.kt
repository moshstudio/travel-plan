package com.travel_plan.commands

import android.app.Activity
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

@InvokeArg
class PingArgs {
    var value: String? = null
}

@InvokeArg
class SaveImageArgs {
    var imageData: String? = null
    var filename: String? = null
}

@InvokeArg
class SaveFileArgs {
    var bytes: ByteArray? = null
    var filename: String? = null
    var mime_type: String? = null
}

@TauriPlugin
class CommandsPlugin(private val activity: Activity) : Plugin(activity) {
    private val implementation = Commands(activity)

    @Command
    fun exitApp(invoke: Invoke) {
        implementation.exitApp()
        val ret = JSObject()
        invoke.resolve(ret)
    }

    @Command
    fun saveImageToPictures(invoke: Invoke) {
        val args = invoke.parseArgs(SaveImageArgs::class.java)
        // 检查参数是否为空
        if (args.imageData == null || args.filename == null) {
            Log.e("saveImageToPictures", "image_data or filename cannot be null")
            return
        }

        try {
            val imageData = Base64.decode(args.imageData, Base64.DEFAULT)
            val bitmap =
                BitmapFactory.decodeByteArray(imageData, 0, imageData.size)
                    ?: run {
                        Log.e(
                            "saveImageToPictures",
                            "Failed to decode bitmap from image_data"
                        )
                        return
                    }

            val uri =
                implementation.saveImageToPictures(bitmap, args.filename!!)
                    ?: run {
                        Log.e("saveImageToPictures", "Failed to save image")
                        return
                    }

            val ret = JSObject()
            ret.put("uri", uri.toString())
            invoke.resolve(ret)
        } catch (e: Exception) {
            Log.e("saveImageToPictures", "Error saving image: ${e.message}")
        }
    }

    @Command
    fun saveFileToDownloads(invoke: Invoke) {
        try {
            val args = invoke.parseArgs(SaveFileArgs::class.java)

            // 检查必要参数是否为空
            if (args.bytes == null || args.filename == null || args.mime_type == null) {
                Log.e("saveImageToPictures", "bytes, filename or mime_type cannot be null")
                return
            }

            // 尝试保存文件
            val uri =
                implementation.saveFileToDownloads(args.bytes!!, args.filename!!, args.mime_type!!)
                    ?: run {
                        Log.e("saveImageToPictures", "Failed to save file to Downloads")
                        return
                    }

            // 返回成功结果
            val ret = JSObject()
            ret.put("uri", uri.toString())
            invoke.resolve(ret)
        } catch (e: Exception) {
            Log.e("saveImageToPictures", "Error saving file to Downloads: ${e.message}")
        }
    }
}
