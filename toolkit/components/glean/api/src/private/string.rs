// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

use inherent::inherent;
use std::sync::Arc;

use super::{CommonMetricData, MetricGetter, MetricId};
use crate::ipc::need_ipc;

/// A string metric.
///
/// Record an Unicode string value with arbitrary content.
/// Strings are length-limited to `MAX_LENGTH_VALUE` bytes.
///
/// # Example
///
/// The following piece of code will be generated by `glean_parser`:
///
/// ```rust,ignore
/// use glean::metrics::{StringMetric, CommonMetricData, Lifetime};
/// use once_cell::sync::Lazy;
///
/// mod browser {
///     pub static search_engine: Lazy<StringMetric> = Lazy::new(|| StringMetric::new(CommonMetricData {
///         name: "search_engine".into(),
///         category: "browser".into(),
///         lifetime: Lifetime::Ping,
///         disabled: false,
///         dynamic_label: None
///     }));
/// }
/// ```
///
/// It can then be used with:
///
/// ```rust,ignore
/// browser::search_engine.set("websearch");
/// ```
#[derive(Clone)]
pub enum StringMetric {
    Parent {
        /// The metric's ID. Used for testing and profiler markers. String
        /// metrics can be labeled, so we may have either a metric ID or
        /// sub-metric ID.
        id: MetricGetter,
        inner: Arc<glean::private::StringMetric>,
    },
    Child(StringMetricIpc),
}
#[derive(Clone, Debug)]
pub struct StringMetricIpc;

impl StringMetric {
    /// Create a new string metric.
    pub fn new(id: MetricId, meta: CommonMetricData) -> Self {
        if need_ipc() {
            StringMetric::Child(StringMetricIpc)
        } else {
            StringMetric::Parent {
                id: id.into(),
                inner: Arc::new(glean::private::StringMetric::new(meta)),
            }
        }
    }

    #[cfg(test)]
    pub(crate) fn child_metric(&self) -> Self {
        match self {
            StringMetric::Parent { .. } => StringMetric::Child(StringMetricIpc),
            StringMetric::Child(_) => panic!("Can't get a child metric from a child metric"),
        }
    }
}

#[inherent]
impl glean::traits::String for StringMetric {
    /// Sets to the specified value.
    ///
    /// # Arguments
    ///
    /// * `value` - The string to set the metric to.
    ///
    /// ## Notes
    ///
    /// Truncates the value if it is longer than `MAX_STRING_LENGTH` bytes and logs an error.
    pub fn set<S: Into<std::string::String>>(&self, value: S) {
        match self {
            #[allow(unused)]
            StringMetric::Parent { id, inner } => {
                let value = value.into();
                #[cfg(feature = "with_gecko")]
                gecko_profiler::lazy_add_marker!(
                    "String::set",
                    super::profiler_utils::TelemetryProfilerCategory,
                    super::profiler_utils::StringLikeMetricMarker::new(*id, &value)
                );
                inner.set(value);
            }
            StringMetric::Child(_) => {
                log::error!("Unable to set string metric in non-main process. This operation will be ignored.");
                // If we're in automation we can panic so the instrumentor knows they've gone wrong.
                // This is a deliberate violation of Glean's "metric APIs must not throw" design.
                assert!(!crate::ipc::is_in_automation(), "Attempted to set string metric in non-main process, which is forbidden. This panics in automation.");
                // TODO: Record an error.
            }
        };
    }

    /// **Exported for test purposes.**
    ///
    /// Gets the currently stored value as a string.
    ///
    /// This doesn't clear the stored value.
    ///
    /// # Arguments
    ///
    /// * `ping_name` - represents the optional name of the ping to retrieve the
    ///   metric for. Defaults to the first value in `send_in_pings`.
    pub fn test_get_value<'a, S: Into<Option<&'a str>>>(
        &self,
        ping_name: S,
    ) -> Option<std::string::String> {
        let ping_name = ping_name.into().map(|s| s.to_string());
        match self {
            StringMetric::Parent { id: _, inner } => inner.test_get_value(ping_name),
            StringMetric::Child(_) => {
                panic!("Cannot get test value for string metric in non-main process!")
            }
        }
    }

    /// **Exported for test purposes.**
    ///
    /// Gets the number of recorded errors for the given metric and error type.
    ///
    /// # Arguments
    ///
    /// * `error` - The type of error
    /// * `ping_name` - represents the optional name of the ping to retrieve the
    ///   metric for. Defaults to the first value in `send_in_pings`.
    ///
    /// # Returns
    ///
    /// The number of errors reported.
    pub fn test_get_num_recorded_errors(&self, error: glean::ErrorType) -> i32 {
        match self {
            StringMetric::Parent { id: _, inner } => inner.test_get_num_recorded_errors(error),
            StringMetric::Child(_) => panic!(
                "Cannot get the number of recorded errors for string metric in non-main process!"
            ),
        }
    }
}

#[cfg(test)]
mod test {
    use crate::{common_test::*, ipc, metrics};

    #[test]
    fn sets_string_value() {
        let _lock = lock_test();

        let metric = &metrics::test_only_ipc::a_string;

        metric.set("test_string_value");

        assert_eq!(
            "test_string_value",
            metric.test_get_value("test-ping").unwrap()
        );
    }

    #[test]
    fn string_ipc() {
        // StringMetric doesn't support IPC.
        let _lock = lock_test();

        let parent_metric = &metrics::test_only_ipc::a_string;

        parent_metric.set("test_parent_value");

        {
            let child_metric = parent_metric.child_metric();

            let _raii = ipc::test_set_need_ipc(true);

            // Instrumentation calls do not panic.
            child_metric.set("test_string_value");

            // (They also shouldn't do anything,
            // but that's not something we can inspect in this test)
        }

        assert!(ipc::replay_from_buf(&ipc::take_buf().unwrap()).is_ok());

        assert!(
            "test_parent_value" == parent_metric.test_get_value("test-ping").unwrap(),
            "String metrics should only work in the parent process"
        );
    }
}
