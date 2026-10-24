#!/usr/bin/env python3
"""
Root forwarding wrapper for backend/migrate_to_mongo.py
"""
import os
import sys

backend_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "migrate_to_mongo.py")
if __name__ == "__main__":
    import runpy
    sys.argv[0] = backend_script
    runpy.run_path(backend_script, run_name="__main__")
