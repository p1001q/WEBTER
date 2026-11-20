import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / 'deploy.sh'
VALIDATION = SCRIPT.read_text().split("<<'PY'\n", 1)[1].split('\nPY\n', 1)[0]


class ImageCredentialDeploymentTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.incoming = self.root / 'new.env'
        self.previous = self.root / 'previous.env'
        self.output = self.root / 'app.env'
        self.values = {
            'PG_ADMIN_PASSWORD': 'a' * 64,
            'PG_APP_PASSWORD': 'b' * 64,
            'REDIS_PASSWORD': 'c' * 64,
            'SERVICE_EVENT_IP_HMAC_KEY': 'd' * 64,
            'IMAGE_BUCKET': 'test-images',
            'IMAGE_S3_ACCESS_KEY': 'test-access-key',
            'IMAGE_S3_SECRET_KEY': 'test-secret-key',
        }

    def validate(self, returncode=0, exception=None):
        self.incoming.write_text(''.join(f'{k}={v}\n' for k, v in self.values.items()))
        self.previous.write_text(self.incoming.read_text())
        with patch.object(sys, 'argv', ['validate', str(self.incoming), str(self.previous), str(self.output)]), \
             patch.dict(os.environ, {'AWS_SESSION_TOKEN': 'unrelated-session', 'AWS_PROFILE': 'unrelated-profile'}), \
             patch('subprocess.run', side_effect=exception,
                   return_value=subprocess.CompletedProcess([], returncode, stdout=b'{}', stderr=b'sensitive AWS error')) as aws:
            exec(compile(VALIDATION, str(SCRIPT), 'exec'), {})
        return aws

    def test_valid_credentials_are_checked_without_inherited_session(self):
        aws = self.validate()
        env = aws.call_args.kwargs['env']
        self.assertEqual(env['AWS_ACCESS_KEY_ID'], 'test-access-key')
        self.assertNotIn('AWS_SESSION_TOKEN', env)
        self.assertNotIn('AWS_PROFILE', env)
        self.assertIn('IMAGE_BUCKET=test-images', self.output.read_text())
        self.assertNotIn('PG_ADMIN_PASSWORD', self.output.read_text())

    def test_invalid_credentials_stop_before_writing_application_environment(self):
        with self.assertRaisesRegex(SystemExit, 'failed AWS authentication') as error:
            self.validate(returncode=254)
        self.assertNotIn('sensitive AWS error', str(error.exception))
        self.assertFalse(self.output.exists())

    def test_incomplete_pair_is_rejected(self):
        self.values.pop('IMAGE_S3_SECRET_KEY')
        with self.assertRaisesRegex(SystemExit, 'together'):
            self.validate()
        self.assertFalse(self.output.exists())

    def test_timeout_preserves_current_release(self):
        with self.assertRaisesRegex(SystemExit, 'could not complete'):
            self.validate(exception=subprocess.TimeoutExpired('aws', 20))
        self.assertFalse(self.output.exists())

    def test_instance_role_credentials_do_not_require_static_keys(self):
        self.values.pop('IMAGE_S3_ACCESS_KEY')
        self.values.pop('IMAGE_S3_SECRET_KEY')
        self.validate().assert_not_called()
        self.assertTrue(self.output.exists())

    def test_quoted_secret_is_rejected_before_aws_request(self):
        self.values['IMAGE_S3_SECRET_KEY'] = '"test-secret-key"'
        with self.assertRaisesRegex(SystemExit, 'whitespace or quotes'):
            self.validate()
        self.assertFalse(self.output.exists())


if __name__ == '__main__':
    unittest.main()
