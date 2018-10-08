<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * The task that provides a complete restore of mod_gcanvas is defined here.
 *
 * @package     mod_gcanvas
 * @category    restore
 * @copyright   2018 Luuk Verhoeven - LdesignMedia.nl / MoodleFreak.com <luuk@ldesignmedia.nl>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

// For more information about the backup and restore process, please visit:
// https://docs.moodle.org/dev/Backup_2.0_for_developers
// https://docs.moodle.org/dev/Restore_2.0_for_developers

require_once($CFG->dirroot . '//mod/gcanvas/backup/moodle2/restore_gcanvas_stepslib.php');

/**
 * Restore task for mod_gcanvas.
 */
class restore_gcanvas_activity_task extends restore_activity_task {

    /**
     * Defines particular settings that this activity can have.
     */
    protected function define_my_settings() {
        return;
    }

    /**
     * Defines particular steps that this activity can have.
     *
     * @return void .
     * @throws base_task_exception
     * @throws restore_step_exception
     */
    protected function define_my_steps() {
        $this->add_step(new restore_gcanvas_activity_structure_step('gcanvas_structure', 'gcanvas.xml'));
    }

    /**
     * Defines the contents in the activity that must be processed by the link decoder.
     *
     * @return array.
     */
    static public function define_decode_contents() {
        $contents = [];

        // Define the contents.

        return $contents;
    }

    /**
     * Defines the decoding rules for links belonging to the activity to be executed by the link decoder.
     *
     * @return array.
     */
    static public function define_decode_rules() {
        $rules = [];

        // Define the rules.

        return $rules;
    }

    /**
     * Defines the restore log rules that will be applied by the
     * {@link restore_logs_processor} when restoring mod_gcanvas logs. It
     * must return one array of {@link restore_log_rule} objects.
     *
     * @return array.
     */
    static public function define_restore_log_rules() {
        $rules = [];

        // Define the rules.

        return $rules;
    }
}
