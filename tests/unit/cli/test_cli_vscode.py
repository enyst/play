import os
import pathlib
import subprocess
import unittest
from unittest import mock

# Ensure the main module can be imported if tests are run from a different CWD
# This might need adjustment based on your project's specific PYTHONPATH setup for tests
try:
    from openhands.cli import main as cli_main
except ImportError:
    # Attempt a relative import if the above fails (common in some structures)
    # This assumes 'tests' is at the same level as 'openhands'
    import sys
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent.parent.parent))
    from openhands.cli import main as cli_main

class TestVSCodeExtensionInstall(unittest.TestCase):

    @mock.patch('importlib.resources.as_file')
    @mock.patch('importlib.resources.files')
    @mock.patch('pathlib.Path.exists') # Mock for the attempt flag file
    @mock.patch('pathlib.Path.touch')  # Mock for the attempt flag file
    @mock.patch('pathlib.Path.mkdir') # Mock for the attempt flag file dir
    @mock.patch('subprocess.run')
    @mock.patch('builtins.print')
    @mock.patch('openhands.cli.main.logger')
    def run_test_scenario(
        self,
        mock_logger,
        mock_print,
        mock_subprocess_run,
        mock_mkdir, # For attempt flag
        mock_touch, # For attempt flag
        mock_flag_exists, # For attempt flag
        mock_ir_files,
        mock_ir_as_file,
        term_program_env=None,
        flag_file_exists_val=False,
        vsix_exists_val=True,
        vsix_install_rc=0,
        vsix_install_stdout='VSIX Success',
        vsix_install_stderr='',
        marketplace_install_rc=0,
        marketplace_install_stdout='Marketplace Success',
        marketplace_install_stderr='',
        code_command_side_effect=None, # To simulate FileNotFoundError for 'code'
        ir_files_side_effect=None, # For importlib.resources.files side effect
        expected_vsix_install_called=False,
        expected_marketplace_install_called=False
    ):
        original_env = os.environ.copy()
        if term_program_env:
            os.environ['TERM_PROGRAM'] = term_program_env
        elif 'TERM_PROGRAM' in os.environ:
            del os.environ['TERM_PROGRAM']

        mock_flag_exists.return_value = flag_file_exists_val

        # Setup mock for importlib.resources
        mock_vsix_path = mock.MagicMock(spec=pathlib.Path)
        mock_vsix_path.exists.return_value = vsix_exists_val
        mock_vsix_path.__str__.return_value = "/mock/path/to/openhands-vscode-0.0.1.vsix"

        mock_cm_object = mock.MagicMock()
        mock_cm_object.__enter__.return_value = mock_vsix_path
        mock_cm_object.__exit__.return_value = None
        mock_ir_as_file.return_value = mock_cm_object

        # This mock_ir_files needs to return something that joinpath can be called on
        if ir_files_side_effect:
            mock_ir_files.side_effect = ir_files_side_effect
        else:
            mock_resource_locator = mock.MagicMock()
            mock_resource_locator.joinpath.return_value = "mock_resource_path_obj"
            mock_ir_files.return_value = mock_resource_locator


        # Define side effects for subprocess.run based on VSIX or Marketplace
        def subprocess_side_effect(*args, **kwargs):
            command_list = args[0] # command_list is like ['code', '--install-extension', '/path/to/vsix', '--force']
            if code_command_side_effect and command_list[0] == 'code':
                if isinstance(code_command_side_effect, Exception):
                    raise code_command_side_effect
                elif callable(code_command_side_effect):
                    return code_command_side_effect()

            # Check if this is a VSIX install call
            # str(mock_vsix_path) is '/mock/path/to/openhands-vscode-0.0.1.vsix'
            if len(command_list) > 2 and command_list[1] == '--install-extension' and command_list[2] == str(mock_vsix_path):
                return subprocess.CompletedProcess(args=command_list, returncode=vsix_install_rc, stdout=vsix_install_stdout, stderr=vsix_install_stderr)
            # Check if this is a Marketplace install call
            elif len(command_list) > 2 and command_list[1] == '--install-extension' and command_list[2] == 'openhands.openhands-vscode':
                return subprocess.CompletedProcess(args=command_list, returncode=marketplace_install_rc, stdout=marketplace_install_stdout, stderr=marketplace_install_stderr)

            # Default for unrecognized 'code' calls, or other commands if any were to be mocked by subprocess.run
            return subprocess.CompletedProcess(args=command_list, returncode=1, stdout='Unknown command for mock_subprocess_run', stderr='Unknown command for mock_subprocess_run')

        if code_command_side_effect and not callable(code_command_side_effect): # If it's an exception to raise for all 'code' calls
             mock_subprocess_run.side_effect = subprocess_side_effect
        else: # Otherwise, use the detailed side_effect function
            mock_subprocess_run.side_effect = subprocess_side_effect


        cli_main.attempt_vscode_extension_install()

        vsix_install_actually_called = False
        marketplace_install_actually_called = False
        for call_obj in mock_subprocess_run.call_args_list:
            called_command_list = call_obj.args[0]
            if len(called_command_list) > 2 and called_command_list[1] == '--install-extension':
                if called_command_list[2] == str(mock_vsix_path):
                    vsix_install_actually_called = True
                elif called_command_list[2] == 'openhands.openhands-vscode':
                    marketplace_install_actually_called = True

        self.assertEqual(vsix_install_actually_called, expected_vsix_install_called, "VSIX install call expectation mismatch")
        self.assertEqual(marketplace_install_actually_called, expected_marketplace_install_called, "Marketplace install call expectation mismatch")

        if expected_vsix_install_called or expected_marketplace_install_called:
            mock_touch.assert_called_once()
        else:
            mock_touch.assert_not_called()

        os.environ.clear()
        os.environ.update(original_env)
        return mock_print, mock_logger


    def test_not_in_vscode_terminal(self):
        """Should not attempt install if not in VS Code terminal."""
        self.run_test_scenario(term_program_env='other_terminal', expected_vsix_install_called=False, expected_marketplace_install_called=False)

    def test_flag_file_exists(self):
        """Should not attempt install if flag file already exists."""
        self.run_test_scenario(term_program_env='vscode', flag_file_exists_val=True, expected_vsix_install_called=False, expected_marketplace_install_called=False)

    def test_successful_vsix_install(self):
        """Test successful VSIX installation."""
        mock_print, _ = self.run_test_scenario(
            term_program_env='vscode',
            vsix_exists_val=True,
            vsix_install_rc=0,
            expected_vsix_install_called=True,
            expected_marketplace_install_called=False
        )
        self.assertTrue(any("INFO: VS Code extension successfully installed from bundled VSIX." in call.args[0] for call in mock_print.call_args_list))

    def test_vsix_not_found_fallback_to_marketplace_success(self):
        """Test VSIX not found, fallback to successful Marketplace install."""
        mock_print, _ = self.run_test_scenario(
            term_program_env='vscode',
            vsix_exists_val=False, # VSIX does not exist
            marketplace_install_rc=0,
            expected_vsix_install_called=False, # VSIX install itself not called as vsix_path.exists() is false
            expected_marketplace_install_called=True
        )
        self.assertTrue(any("INFO: VS Code extension installation command sent successfully (Marketplace)." in call.args[0] for call in mock_print.call_args_list))
        # Check that logger.info was called about VSIX not found
        # The specific message depends on how importlib.resources fails or if vsix_path.exists() is false.
        # If vsix_exists_val is False, main.py logs: "Bundled VSIX file not found at resolved path..."
        self.assertTrue(any("Bundled VSIX file not found at resolved path" in call.args[0] for call in _.info.call_args_list)) # _ is mock_logger


    def test_vsix_install_fails_fallback_to_marketplace_success(self):
        """Test VSIX install fails, fallback to successful Marketplace install."""
        mock_print, mock_logger = self.run_test_scenario(
            term_program_env='vscode',
            vsix_exists_val=True,
            vsix_install_rc=1, # VSIX install fails
            marketplace_install_rc=0, # Marketplace succeeds
            expected_vsix_install_called=True,
            expected_marketplace_install_called=True
        )
        self.assertTrue(any("Bundled .vsix installation failed" in call.args[0] for call in mock_logger.warning.call_args_list))
        self.assertTrue(any("INFO: VS Code extension installation command sent successfully (Marketplace)." in call.args[0] for call in mock_print.call_args_list))


    def test_code_command_not_found_for_vsix_fallback_to_marketplace(self):
        """Test 'code' not found for VSIX, fallback to Marketplace which also fails with 'code' not found."""
        # Simulate 'code' command not found for both attempts
        def code_not_found_side_effect(*args, **kwargs):
            raise FileNotFoundError("'code' command not found")

        mock_print, mock_logger_obj = self.run_test_scenario( # Use mock_logger_obj to avoid clash with decorator
            term_program_env='vscode',
            vsix_exists_val=True,
            code_command_side_effect=code_not_found_side_effect, # code command itself fails
            expected_vsix_install_called=True, # Attempted, but raised FileNotFoundError during subprocess.run
            expected_marketplace_install_called=True # Also attempted, also raised FileNotFoundError during subprocess.run
        )
        # If subprocess.run for VSIX raises FileNotFoundError, it might be caught by the first 'except FileNotFoundError:'
        # which is intended for importlib.resources issues.
        self.assertTrue(any("Could not locate bundled .vsix" in call.args[0] for call in mock_logger_obj.info.call_args_list))
        # Marketplace part's FileNotFoundError from subprocess.run results in a specific print
        self.assertTrue(any("INFO: 'code' command not found" in call.args[0] for call in mock_print.call_args_list))

    def test_marketplace_install_fails_after_vsix_not_found(self):
        """Test VSIX not found, and Marketplace install also fails."""
        mock_print, mock_logger = self.run_test_scenario(
            term_program_env='vscode',
            vsix_exists_val=False, # VSIX not found
            marketplace_install_rc=1, # Marketplace fails
            expected_vsix_install_called=False,
            expected_marketplace_install_called=True
        )
        # VSIX not found log
        self.assertTrue(any("Bundled VSIX file not found at resolved path" in call.args[0] for call in mock_logger.info.call_args_list))
        # Marketplace failed print
        self.assertTrue(any("INFO: VS Code extension installation command might have failed (Marketplace)." in call.args[0] for call in mock_print.call_args_list))
        # Marketplace failed log
        self.assertTrue(any("Marketplace installation for 'openhands.openhands-vscode' failed" in call.args[0] for call in mock_logger.warning.call_args_list))

    # Test for importlib.resources.files raising FileNotFoundError
    def test_vsix_importlib_files_not_found(self):
        mock_print, mock_logger = self.run_test_scenario(
            term_program_env='vscode',
            ir_files_side_effect=FileNotFoundError("Mocked importlib.resources.files error"),
            vsix_exists_val=True, # This won't be reached
            marketplace_install_rc=0, # Marketplace should succeed
            expected_vsix_install_called=False,
            expected_marketplace_install_called=True
        )
        self.assertTrue(any("Could not locate bundled .vsix" in call.args[0] for call in mock_logger.info.call_args_list))
        self.assertTrue(any("INFO: VS Code extension installation command sent successfully (Marketplace)." in call.args[0] for call in mock_print.call_args_list))


    @mock.patch('openhands.cli.main.logger')
    def test_flag_dir_creation_os_error(self, mock_logger_outer): # Renamed to avoid conflict with helper's mock_logger
        """Test OSError during flag directory creation."""
        # This test cannot use the run_test_scenario helper easily due to specific mock timing.
        original_env = os.environ.copy()
        os.environ['TERM_PROGRAM'] = 'vscode'

        with mock.patch('pathlib.Path.exists', return_value=False), \
             mock.patch('pathlib.Path.mkdir', side_effect=OSError("Permission denied")):
            cli_main.attempt_vscode_extension_install()

        os.environ.clear()
        os.environ.update(original_env)
        # Check if the logger passed to the method (if any) or the global logger was called.
        # This assertion depends on how logger is used within attempt_vscode_extension_install
        # For this test, we assume the logger instance inside cli_main is what matters.
        # So we check the mock_logger_outer which is patching 'openhands.cli.main.logger'
        self.assertTrue(any("Could not create or check VS Code extension flag directory" in call.args[0] for call in mock_logger_outer.warning.call_args_list))


    @mock.patch('openhands.cli.main.logger') # Patching the global logger for cli_main
    def test_flag_file_touch_os_error(self, mock_logger_direct): # Renamed to avoid conflict
        """Test OSError during flag file touch."""
        original_env = os.environ.copy()
        os.environ['TERM_PROGRAM'] = 'vscode'

        # Mock other parts that lead up to the touch operation
        with mock.patch('pathlib.Path.exists', return_value=False), \
             mock.patch('pathlib.Path.mkdir'), \
             mock.patch('importlib.resources.files'), \
             mock.patch('importlib.resources.as_file') as mock_as_file, \
             mock.patch('subprocess.run') as mock_sub_run, \
             mock.patch('builtins.print'), \
             mock.patch('pathlib.Path.touch', side_effect=OSError("Cannot touch")):

            # Ensure VSIX path is not taken, or if taken, subprocess.run is fine
            # Easiest is to make VSIX path not exist to go to marketplace path
            mock_vsix_path_inner = mock.MagicMock(spec=pathlib.Path)
            mock_vsix_path_inner.exists.return_value = False # VSIX not found
            mock_cm_inner = mock.MagicMock()
            mock_cm_inner.__enter__.return_value = mock_vsix_path_inner
            mock_cm_inner.__exit__.return_value = None
            mock_as_file.return_value = mock_cm_inner

            # Marketplace subprocess run should be successful for this test
            mock_sub_run.return_value = subprocess.CompletedProcess(args=[], returncode=0, stdout='Success', stderr='')

            cli_main.attempt_vscode_extension_install()

        os.environ.clear()
        os.environ.update(original_env)
        self.assertTrue(any("Could not create VS Code extension attempt flag file" in call.args[0] for call in mock_logger_direct.warning.call_args_list))


if __name__ == '__main__':
    unittest.main()
