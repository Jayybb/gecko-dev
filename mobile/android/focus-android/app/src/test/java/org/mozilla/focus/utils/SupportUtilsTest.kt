/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.utils

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import java.util.Locale

class SupportUtilsTest {

    @Test
    fun cleanup() {
        // Other tests might get confused by our locale fiddling, so lets go back to the default:
        Locale.setDefault(Locale.ENGLISH)
    }

    /*
     * Super simple sumo URL test - it exists primarily to verify that we're setting the language
     * and page tags correctly. appVersion is null in tests, so we just test that there's a null there,
     * which doesn't seem too useful...
     */
    @Test
    @Throws(Exception::class)
    fun getSumoURLForTopic() {
        val versionName = "testVersion"

        val testTopic = SupportUtils.SumoTopic.TRACKERS
        val testTopicStr = testTopic.topicStr

        Locale.setDefault(Locale.GERMANY)
        assertEquals(
            "https://support.mozilla.org/1/mobile/$versionName/Android/de-DE/$testTopicStr",
            SupportUtils.getSumoURLForTopic(versionName, testTopic),
        )

        Locale.setDefault(Locale.CANADA_FRENCH)
        assertEquals(
            "https://support.mozilla.org/1/mobile/$versionName/Android/fr-CA/$testTopicStr",
            SupportUtils.getSumoURLForTopic(versionName, testTopic),
        )
    }

    /**
     * This is a pretty boring tests - it exists primarily to verify that we're actually setting
     * a langtag in the manfiesto URL.
     */
    @Test
    @Throws(Exception::class)
    fun getManifestoURL() {
        Locale.setDefault(Locale.UK)
        assertEquals(
            "https://www.mozilla.org/en-GB/about/manifesto/",
            SupportUtils.manifestoURL,
        )

        Locale.setDefault(Locale.KOREA)
        assertEquals(
            "https://www.mozilla.org/ko-KR/about/manifesto/",
            SupportUtils.manifestoURL,
        )
    }

    @Test
    fun `getMozillaPageUrl returns the correct URL for the terms of service`() {
        Locale.setDefault(Locale.UK)
        assertEquals(
            "https://www.mozilla.org/en-GB/about/legal/terms/firefox-focus/",
            SupportUtils.getMozillaPageUrl(SupportUtils.MozillaPage.TERMS_OF_SERVICE),
        )

        Locale.setDefault(Locale.GERMAN)
        assertEquals(
            "https://www.mozilla.org/de/about/legal/terms/firefox-focus/",
            SupportUtils.getMozillaPageUrl(SupportUtils.MozillaPage.TERMS_OF_SERVICE),
        )
    }

    @Test
    fun `getMozillaPageUrl returns the correct URL for the privacy notice`() {
        Locale.setDefault(Locale.UK)
        assertEquals(
            "https://www.mozilla.org/en-GB/privacy/firefox-focus/",
            SupportUtils.getMozillaPageUrl(SupportUtils.MozillaPage.PRIVATE_NOTICE),
        )

        Locale.setDefault(Locale.GERMAN)
        assertEquals(
            "https://www.mozilla.org/de/privacy/firefox-focus/",
            SupportUtils.getMozillaPageUrl(SupportUtils.MozillaPage.PRIVATE_NOTICE),
        )
    }

    @Test
    fun `appVersionName returns proper value`() {
        val context: Context = mock()
        val packageManager: PackageManager = mock()
        val packageInfo = PackageInfo().apply { versionName = "1.0.0" }

        `when`(context.packageManager).thenReturn(packageManager)
        `when`(context.packageName).thenReturn("org.mozilla.focus")
        `when`(packageManager.getPackageInfo("org.mozilla.focus", 0)).thenReturn(packageInfo)

        val version = SupportUtils.getAppVersion(context)
        assertEquals("1.0.0", version)
    }

    @Test
    fun `appVersionName returns empty string when versionName is null`() {
        val context: Context = mock()
        val packageManager: PackageManager = mock()
        val packageInfo = PackageInfo().apply { versionName = null }

        `when`(context.packageManager).thenReturn(packageManager)
        `when`(context.packageName).thenReturn("org.mozilla.focus")
        `when`(packageManager.getPackageInfo("org.mozilla.focus", 0)).thenReturn(packageInfo)

        val version = SupportUtils.getAppVersion(context)
        assertEquals("", version)
    }

    @Test
    fun `appVersionName throws IllegalStateException when package not found`() {
        val context: Context = mock()
        val packageManager: PackageManager = mock()

        `when`(context.packageManager).thenReturn(packageManager)
        `when`(context.packageName).thenReturn("org.mozilla.focus")
        `when`(packageManager.getPackageInfo("org.mozilla.focus", 0))
            .thenThrow(PackageManager.NameNotFoundException::class.java)

        assertThrows(IllegalStateException::class.java) {
            SupportUtils.getAppVersion(context)
        }
    }
}
