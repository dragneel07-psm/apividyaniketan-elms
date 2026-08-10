# Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
# Unauthorized copying, modification, or distribution of this file,
# via any medium, is strictly prohibited. Proprietary and confidential.
from unittest.mock import MagicMock, patch

from django.core.files.base import ContentFile
from django.test import SimpleTestCase, override_settings

from core.storage import ImageKitStorage


@override_settings(
    IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/testaccount",
    IMAGEKIT_ROOT_FOLDER="vidyaniketan",
)
class ImageKitStorageTests(SimpleTestCase):
    def setUp(self):
        self.storage = ImageKitStorage()

    def test_url_builds_cdn_path_with_root_folder(self):
        url = self.storage.url("school_logo/abc123-logo.png")
        self.assertEqual(
            url, "https://ik.imagekit.io/testaccount/vidyaniketan/school_logo/abc123-logo.png"
        )

    @override_settings(IMAGEKIT_ROOT_FOLDER="")
    def test_url_without_root_folder(self):
        url = self.storage.url("notices/abc-file.pdf")
        self.assertEqual(url, "https://ik.imagekit.io/testaccount/notices/abc-file.pdf")

    def test_exists_always_false(self):
        # Names are uuid-prefixed and unique by construction — see module
        # docstring — so exists() never needs to hit the API.
        self.assertFalse(self.storage.exists("anything/at-all.png"))

    @patch("core.storage._client")
    def test_save_uploads_to_imagekit_folder_derived_from_name(self, mock_client):
        client = MagicMock()
        mock_client.return_value = client

        name = self.storage._save(
            "school_logo/abc123-logo.png", ContentFile(b"pngdata", name="logo.png")
        )

        self.assertEqual(name, "school_logo/abc123-logo.png")
        client.files.upload.assert_called_once()
        _, kwargs = client.files.upload.call_args
        self.assertEqual(kwargs["file"], b"pngdata")
        self.assertEqual(kwargs["file_name"], "abc123-logo.png")
        self.assertEqual(kwargs["folder"], "/vidyaniketan/school_logo")
        self.assertFalse(kwargs["use_unique_file_name"])
        self.assertTrue(kwargs["overwrite_file"])

    @patch("core.storage._client")
    def test_delete_resolves_file_id_then_deletes(self, mock_client):
        client = MagicMock()
        found = MagicMock(name="abc123-logo.png", file_id="file_abc")
        found.name = "abc123-logo.png"
        client.assets.list.return_value = [found]
        mock_client.return_value = client

        self.storage.delete("school_logo/abc123-logo.png")

        client.assets.list.assert_called_once_with(
            path="/vidyaniketan/school_logo",
            search_query='name="abc123-logo.png"',
            limit=1,
        )
        client.files.delete.assert_called_once_with("file_abc")

    @patch("core.storage._client")
    def test_delete_is_a_noop_when_file_not_found(self, mock_client):
        client = MagicMock()
        client.assets.list.return_value = []
        mock_client.return_value = client

        self.storage.delete("school_logo/missing.png")

        client.files.delete.assert_not_called()

    @patch("core.storage._client")
    def test_delete_swallows_imagekit_errors(self, mock_client):
        client = MagicMock()
        client.assets.list.side_effect = RuntimeError("network down")
        mock_client.return_value = client

        # Mirrors FileSystemStorage.delete(), which is also best-effort.
        self.storage.delete("school_logo/abc123-logo.png")
