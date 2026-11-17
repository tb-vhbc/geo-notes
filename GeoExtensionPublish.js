const _ = require("lodash");

const DEFAULT_OPTIONS = {
  insecureServer: false
};

class GeoExtensionPublish {
  constructor(options) {
    this.options = _.extend({}, DEFAULT_OPTIONS, options);

    if (
      !this.options.accessToken &&
      (!this.options.clientId || !this.options.secret)
    ) {
      console.warn(
        "no secret where provided for the extension, it won't be able to publish on a server"
      );
    }
    if (this.options.accessToken) {
      this.accessToken = this.options.accessToken;
    }
    if (this.options.insecureServer) {
      // fetch natif : pas d'option par requête, on désactive la vérification TLS pour le process (dev uniquement)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      console.warn("GEO_INSECURE actif : vérification du certificat TLS désactivée");
    }
  }

  /**
   * Requête HTTP vers le serveur GEO.
   * @param {string} path chemin relatif au serveur (ex: /aas/v1/extensions/create)
   * @param {object} opts { method, form, formData, qs, auth }
   */
  async request(path, { method = "GET", form, formData, qs, auth = true, headers = {} } = {}) {
    let url = this.options.server + path;
    if (qs) {
      url += "?" + new URLSearchParams(qs).toString();
    }
    const init = { method, headers: { Accept: "application/json", ...headers } };
    if (auth) {
      init.headers.Authorization = "Bearer " + (await this.getAccessToken());
    }
    if (form) {
      init.body = new URLSearchParams(form);
    } else if (formData) {
      init.body = formData;
    }

    const res = await fetch(url, init);
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch (e) {
      body = text;
    }
    if (!res.ok) {
      const msg = body && body.message ? body.message : text;
      throw new Error(`HTTP ${res.status} ${res.statusText} sur ${path} : ${msg}`);
    }
    this.checkResponse(body);
    return body;
  }

  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }
    // OAuth2 client_credentials (comportement identique à l'ancien client-oauth2 :
    // paramètres envoyés à la fois en query et en body)
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      scope: ["geo:aas", "profile"].join(" ")
    }).toString();
    const basic = Buffer.from(
      `${encodeURIComponent(this.options.clientId)}:${encodeURIComponent(this.options.secret)}`
    ).toString("base64");

    const res = await fetch(`${this.options.server}/auth/token?${params}`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + basic,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json, application/x-www-form-urlencoded"
      },
      body: params
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = Object.fromEntries(new URLSearchParams(text));
    }
    if (!res.ok || !data.access_token) {
      throw new Error(
        `Impossible d'obtenir un jeton GEO (HTTP ${res.status}) : ${data.error_description || data.error || text}`
      );
    }
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  async createOrUpdateExtensionFromZip(extensionDefinition, module) {
    const existing = await this.findExtensionByName(extensionDefinition.name);
    if (!existing) {
      console.warn("this module does not exist on GEO Platform and will be created.");
      return this.createFromZip(extensionDefinition, module);
    } else {
      console.warn(`Updating  existing module, with id:  ${existing}`);
      return this.updateFromZip(extensionDefinition, module);
    }
  }

  async updateFromZip(extensionDefinition, module) {
    const result = await this.request("/aas/v1/extensions/update", {
      method: "POST",
      form: { extension: module.data }
    });
    console.warn("the module has been updated");
    return result && result.id;
  }

  async createFromZip(extensionDefinition, module) {
    const result = await this.request("/aas/v1/extensions/create", {
      method: "POST",
      form: { extension: module.data }
    });
    console.warn("the module has been created");
    return result && result.id;
  }

  /**
   * Create or update an extension (V1 compatibility)
   * @param {Object} extensionDefinition
   * @param {Array} archiveItems
   */
  async createOrUpdate(extensionDefinition, archiveItems) {
    // check if extension already exists (by name)
    let existing = await this.findExtensionByCodeName(extensionDefinition.name);
    if (existing) {
      console.log(`Reusing extensiong ${existing.id}`);
      let archiveId = existing.code.archive ? existing.code.archive.targetId : null;
      if (!archiveId)
        throw new Error(
          "Extension does not have an archive (are you modifying a system extension)"
        );
      console.log(`Updating archive extension ${archiveId} with ${archiveItems.length} items`);
      await this.updateArchive(archiveId, archiveItems);
      this.processExtension(extensionDefinition, archiveId);
      console.log(`Updating extension ${existing.id}`);
      await this.updateExtension(existing.id, extensionDefinition);
      return existing.id;
    } else {
      console.log(`Creating new extension`);
      console.log(`Creating archive`);
      let archiveId = await this.createArchive(
        "Archive of " + extensionDefinition.name,
        archiveItems
      );
      console.log(`Created archive extension ${archiveId} with ${archiveItems.length} items`);
      this.processExtension(extensionDefinition, archiveId);
      let extensionId = await this.createExtension(extensionDefinition);
      console.log(`Created extension ${extensionId}`);
      return extensionId;
    }
  }

  async updatePreview(id, preview, mimeType) {
    await this.lock(id);
    const formData = new FormData();
    formData.append("id", id);
    formData.append("mimeType", mimeType);
    formData.append("content", new Blob([preview], { type: "image/png" }), "noname.png");
    await this.request("/aas/v1/resources/uploadPreview", { method: "POST", formData });
    await this.unlock(id);
  }

  processExtension(extensionDefinition, archiveId) {
    extensionDefinition.code = {
      "@type": "com.bg.functionality.canvas.extension.ArchiveExtensionCode",
      moduleName: extensionDefinition.moduleName || null,
      printModuleName: extensionDefinition.moduleName || null,
      archive: {
        "@dependencyFor": "com.bg.functionality.canvas.extension.ExtensionArchive",
        targetId: archiveId
      }
    };
    extensionDefinition["@type"] = "com.bg.functionality.canvas.extension.ExtensionDefinition";
  }

  async createExtension(value) {
    return this.createResource(value.name, value);
  }

  async updateArchive(id, items) {
    return this.updateResource(id, {
      "@type": "com.bg.functionality.canvas.extension.ExtensionArchive",
      items
    });
  }

  async updateExtension(id, value) {
    return this.updateResource(id, value);
  }

  async createArchive(name, items) {
    return this.createResource(name, {
      "@type": "com.bg.functionality.canvas.extension.ExtensionArchive",
      items
    });
  }

  async updateResource(id, value) {
    await this.lock(id);
    await this.request("/aas/v1/resources/update", {
      method: "POST",
      form: { id, value: JSON.stringify({ value }) }
    });
    await this.unlock(id);
  }

  async createResource(name, value) {
    const result = await this.request("/aas/v1/resources/create", {
      method: "POST",
      form: { name, value: JSON.stringify({ value }) }
    });
    return result.id;
  }

  async lock(id) {
    return this.request("/aas/v1/resources/lock", { method: "POST", form: { id } });
  }

  async unlock(id) {
    return this.request("/aas/v1/resources/unlock", { method: "POST", form: { id } });
  }

  async findExtensionByCodeName(name) {
    const result = await this.request("/aas/v1/resources/searchValues", {
      qs: {
        type: "com.bg.functionality.canvas.extension.ExtensionDefinition",
        limit: 1,
        condition: JSON.stringify({
          "@type": "NameCondition",
          value: name,
          operator: "EQUAL"
        })
      }
    });
    return result && result.length > 0 ? result[0].value : null;
  }

  async findExtensionByName(name) {
    const result = await this.request(
      `/aas/v1/extensions/${encodeURIComponent(name)}/headers`
    );
    return result != undefined && result.id != undefined ? result.id : null;
  }

  checkResponse(res) {
    if (res && res.errorNumber) {
      throw new Error(`REST API Error ${res.errorNumber} (${res.message})`);
    }
  }
}

module.exports = GeoExtensionPublish;
