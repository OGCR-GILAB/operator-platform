import { Model, assign } from "./_model";

/** `projects/{id}/monitoring-plan/` — a single object, not a list. */
class MonitoringPlan extends Model {
  static WRITABLE = [
    'date_submitted',
    'monitored_data_parameters',
    'monitoring_frequency',
    'emission_sources_and_sinks',
    'data_source',
    'measurement_methods_procedures_accuracy_calibration',
    'quality_assessment_or_quality_control_procedures',
    'responsibility_for_collection_and_archiving',
  ];

  static READABLE = ['id', 'project', 'created_at', 'updated_at'];

  constructor(data = {}) {
    super();
    assign(this, data, MonitoringPlan.WRITABLE);
    assign(this, data, MonitoringPlan.READABLE);

    // `[{ name, unit, scope }]`
    if (this.monitored_data_parameters == null) this.monitored_data_parameters = [];
  }

  get isStarted() {
    return MonitoringPlan.WRITABLE.some((field) => {
      const value = this[field];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    });
  }
}

export const emptyMonitoredParameter = () => ({ name: '', unit: '', scope: '' });

export default MonitoringPlan;
