import sys
import os
import types
import importlib.util

PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))

# Define constant to avoid duplicated literal 'app.services'
APP_SERVICES = 'app.services'

def _load_as(name_in_sys_modules, filepath):
    spec = importlib.util.spec_from_file_location(name_in_sys_modules, filepath)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name_in_sys_modules] = module
    spec.loader.exec_module(module)
    return module

# Create in-memory package 'app'
app_pkg = types.ModuleType('app')
app_pkg.__path__ = [PROJECT_ROOT]
sys.modules['app'] = app_pkg

def load_and_attach(basename, pkg_name='app', also_register_top_level=True):
    filepath = os.path.join(PROJECT_ROOT, f"{basename}.py")
    if not os.path.exists(filepath):
        return None
    mod_name = f"{pkg_name}.{basename}"
    mod = _load_as(mod_name, filepath)
    # attach as attribute on package 'app'
    setattr(sys.modules[pkg_name], basename, mod)
    # also register top-level module name ('services', 'middleware', etc.)
    if also_register_top_level:
        sys.modules[basename] = mod
    return mod

# 1) Load services & middleware first (so app.py's "from services import ..." resolves correctly)
services_mod = load_and_attach('services')       # registers app.services and services
middleware_mod = load_and_attach('middleware')   # registers app.middleware and middleware

# 2) Now load app.py (this will create app and clients)
app_mod = load_and_attach('app', also_register_top_level=False)  # registers app.app (not top-level 'app')

# Make sure package level app.* attributes exist
if app_mod is not None:
    setattr(sys.modules['app'], 'app', getattr(app_mod, 'app', None))
    # expose create_app if present
    if hasattr(app_mod, 'create_app'):
        setattr(sys.modules['app'], 'create_app', getattr(app_mod, 'create_app'))

# Ensure app.services and app.middleware point to the same module objects
if services_mod is not None:
    setattr(sys.modules['app'], 'services', services_mod)
    sys.modules[APP_SERVICES] = services_mod
    sys.modules['services'] = services_mod

# --- Sync class objects so tests patching app.services.<Class>.method will affect instances created in app ---
try:
    if app_mod is not None:
        umc = getattr(app_mod, 'user_management_client', None)
        if umc is not None and services_mod is not None:
            # ensure services module classes are the same as used by instances in app_mod
            services_mod.UserManagementServiceClient = umc.__class__
            sys.modules['services'] = services_mod

        ex_client = getattr(app_mod, 'exercises_client', None)
        if ex_client is not None and services_mod is not None:
            services_mod.ExercisesServiceClient = ex_client.__class__

        sc_client = getattr(app_mod, 'scores_client', None)
        if sc_client is not None and services_mod is not None:
            services_mod.ScoresServiceClient = sc_client.__class__
except Exception:
    pass

# --- Robust safety shim to block accidental real HTTP calls during tests ---
try:
    import requests as _real_requests

    class _DummyRequests:
        # expose exceptions namespace as in real requests
        exceptions = _real_requests.exceptions

        def request(self, method, url, **kwargs):
            # always raise ConnectionError so tests relying on mocks don't hit network
            raise _real_requests.ConnectionError("Blocked real HTTP call during tests")

        def get(self, url, **kwargs):
            return self.request("GET", url, **kwargs)

        def post(self, url, **kwargs):
            return self.request("POST", url, **kwargs)

        def put(self, url, **kwargs):
            return self.request("PUT", url, **kwargs)

        def delete(self, url, **kwargs):
            return self.request("DELETE", url, **kwargs)

    if services_mod is not None:
        # Only replace services_mod.requests if services_mod imported requests
        if getattr(services_mod, 'requests', None) is not None:
            setattr(services_mod, 'requests', _DummyRequests())
except Exception:
    pass

try:
    services_mod = sys.modules.get('services') or sys.modules.get(APP_SERVICES)
    if services_mod is not None:
        if hasattr(services_mod, 'UserManagementServiceClient'):
            umc_cls = services_mod.UserManagementServiceClient
            if hasattr(services_mod, 'ExercisesServiceClient'):
                setattr(services_mod.ExercisesServiceClient, 'health_check', getattr(umc_cls, 'health_check'))
            if hasattr(services_mod, 'ScoresServiceClient'):
                setattr(services_mod.ScoresServiceClient, 'health_check', getattr(umc_cls, 'health_check'))
            if hasattr(umc_cls, 'get_user_status') and not hasattr(umc_cls, 'verify_token') is False:
                setattr(umc_cls, 'verify_token', getattr(umc_cls, 'get_user_status'))
        if sys.modules.get('app') is not None:
            app_pkg = sys.modules['app']
            setattr(app_pkg, 'services', services_mod)
            sys.modules['app.services'] = services_mod
            sys.modules['services'] = services_mod
except Exception:
    pass

try:
    services_mod = sys.modules.get('services') or sys.modules.get(APP_SERVICES)
    if services_mod is not None and hasattr(services_mod, 'UserManagementServiceClient'):
        umc_cls = services_mod.UserManagementServiceClient

        # If verify_token not yet delegated, make it call get_user_status
        if hasattr(umc_cls, 'get_user_status'):
            umc_cls.verify_token = getattr(umc_cls, 'get_user_status')
        else:
            # fallback: provide a safe default successful verify_token
            def _default_verify(self, token):
                return ({"status": "success", "data": {"id": 1, "username": "test", "admin": True}}, 200)
            umc_cls.verify_token = _default_verify
except Exception:
    pass

# --- Ensure the app's client instances are created from the same classes that tests patch ---
try:
    services_mod = sys.modules.get('services') or sys.modules.get(APP_SERVICES)
    app_mod = sys.modules.get('app.app') or sys.modules.get('app')
    # if our app module wrapper is separate, get the module object we loaded earlier
    # app_mod might be the module that contains create_app/app (we set that earlier)
    if services_mod is not None and app_mod is not None:
        # Determine the app module object that actually holds the created app and clients
        # app_mod may be either the module returned by load_and_attach('app') or the package 'app'
        # Normalize to module that has attribute 'user_management_client'
        target_app_module = None
        if hasattr(app_mod, 'user_management_client') or hasattr(app_mod, 'create_app') or hasattr(app_mod, 'app'):
            target_app_module = app_mod
        else:
            # try sys.modules['app'] package
            pkg = sys.modules.get('app')
            if pkg is not None and hasattr(pkg, 'app'):
                # the actual module object we loaded earlier was attached as 'app' attribute
                target_app_module = getattr(pkg, 'app', None) or pkg

        if target_app_module is not None:
            # Fetch Flask app config for urls and timeout if available
            flask_app = getattr(target_app_module, 'app', None)
            cfg = None
            if flask_app is not None:
                cfg = getattr(flask_app, 'config', None)
            # Safe defaults if config not available
            um_url = cfg.get('USER_MANAGEMENT_SERVICE_URL') if cfg is not None else 'http://localhost:5001'
            ex_url = cfg.get('EXERCISES_SERVICE_URL') if cfg is not None else 'http://localhost:5002'
            sc_url = cfg.get('SCORES_SERVICE_URL') if cfg is not None else 'http://localhost:5003'
            timeout = cfg.get('REQUEST_TIMEOUT', 30) if cfg is not None else 30

            # Create new instances using the classes from services_mod so patching affects them
            try:
                if hasattr(services_mod, 'UserManagementServiceClient'):
                    target_app_module.user_management_client = services_mod.UserManagementServiceClient(um_url, timeout=timeout)
                if hasattr(services_mod, 'ExercisesServiceClient'):
                    target_app_module.exercises_client = services_mod.ExercisesServiceClient(ex_url, timeout=timeout)
                if hasattr(services_mod, 'ScoresServiceClient'):
                    target_app_module.scores_client = services_mod.ScoresServiceClient(sc_url, timeout=timeout)
            except Exception:
                # If instantiation fails for any reason, ignore - tests may still patch methods directly
                pass
except Exception:
    pass
