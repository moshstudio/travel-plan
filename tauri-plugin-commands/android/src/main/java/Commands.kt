package com.travel_plan.commands

import android.app.Activity

class Commands(private val activity: Activity) {
    fun exitApp() {
        activity.finishAffinity()
        android.os.Process.killProcess(android.os.Process.myPid())
    }
}
