package com.travel_plan.commands

import android.app.Activity
import android.graphics.Bitmap
import android.net.Uri
import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.OutputStream

class Commands(private val activity: Activity) {
    fun exitApp() {
        activity.finishAffinity()
        android.os.Process.killProcess(android.os.Process.myPid())
    }

    /**
     * 保存图片到 Pictures 目录
     * @param bitmap 要保存的位图
     * @param filename 文件名（带扩展名，如 "image.png"）
     * @return 保存成功返回 Uri，失败返回 null
     */
    fun saveImageToPictures(bitmap: Bitmap, filename: String): Uri? {
        return saveMediaFile(
            context = activity,
            bytes = bitmap.toByteArray(),
            filename = filename,
            mimeType = "image/png",
            relativePath = Environment.DIRECTORY_PICTURES,
            collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
        )
    }

    /**
     * 保存文件到 Downloads 目录
     * @param bytes 文件内容字节数组
     * @param filename 文件名（带扩展名，如 "document.pdf"）
     * @param mimeType 文件类型（如 "application/pdf"）
     * @return 保存成功返回 Uri，失败返回 null
     */
    fun saveFileToDownloads(
        bytes: ByteArray,
        filename: String,
        mimeType: String
    ): Uri? {
        return saveMediaFile(
            context = activity,
            bytes = bytes,
            filename = filename,
            mimeType = mimeType,
            relativePath = Environment.DIRECTORY_DOWNLOADS,
            collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
        )
    }

    /**
     * 通用 MediaStore 文件保存方法
     */
    private fun saveMediaFile(
        context: Context,
        bytes: ByteArray,
        filename: String,
        mimeType: String,
        relativePath: String,
        collection: Uri
    ): Uri? {
        val resolver = context.contentResolver
        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
            put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
            put(MediaStore.MediaColumns.RELATIVE_PATH, "$relativePath/")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
        }

        return try {
            // 插入文件记录
            val uri = resolver.insert(collection, contentValues) ?: return null

            // 写入文件内容
            resolver.openOutputStream(uri)?.use { outputStream ->
                outputStream.write(bytes)
            }

            // Android Q+ 需要更新 IS_PENDING 状态
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                contentValues.clear()
                contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(uri, contentValues, null, null)
            }

            uri
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * 将 Bitmap 转换为字节数组
     */
    private fun Bitmap.toByteArray(format: Bitmap.CompressFormat = Bitmap.CompressFormat.PNG): ByteArray {
        val outputStream = java.io.ByteArrayOutputStream()
        this.compress(format, 100, outputStream)
        return outputStream.toByteArray()
    }
}
