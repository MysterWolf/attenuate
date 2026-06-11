package com.mysterwolf.attenuate

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  // With New Architecture (Bridgeless), the React context may not be ready at the
  // instant an OAuth redirect intent arrives via onNewIntent — the host is still
  // transitioning from background. Store the intent via setIntent() so getIntent()
  // always returns the latest data, then defer the actual delegate call to the end
  // of the current main-thread message queue (after onResume / onHostResume).
  override fun onNewIntent(intent: Intent?) {
    intent?.let { setIntent(it) }
    Handler(Looper.getMainLooper()).post {
      super.onNewIntent(intent)
    }
  }

  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              super.invokeDefaultOnBackPressed()
          }
          return
      }
      super.invokeDefaultOnBackPressed()
  }
}
