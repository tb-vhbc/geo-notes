const _ = require("lodash");
const fs = require("fs");
const path = require("path");

const GeoExtensionPublish = require("./GeoExtensionPublish");

const DEFAULT_OPTIONS = {
  moduleName: "extension.zip", // nom de l'asset zip produit par ZipPlugin (webpack.config.js passe <name>-<version>.zip)
  publish: true
};

/**
 * Plugin webpack : une fois le zip de l'extension émis (ZipPlugin),
 * l'envoie sur GEO (création ou mise à jour selon qu'elle existe déjà).
 */
class GeoPublishExtension {
  constructor(options) {
    this.options = _.extend({}, DEFAULT_OPTIONS, options);
    if (!this.options.definition) {
      throw new Error("Required option: definition");
    }
    this.extensionDefinition = this.getExtensionDefinition();
    if (this.options.publish) {
      if (!this.options.server) {
        throw new Error("Required option for publishing: server (GEO_SERVER)");
      }
      this.publisher = new GeoExtensionPublish(this.options);
    }
  }

  apply(compiler) {
    if (!this.options.publish) return;

    compiler.hooks.afterEmit.tapPromise("GeoPublishPlugin", async compilation => {
      const asset = compilation.getAsset(this.options.moduleName);
      if (!asset) {
        compilation.errors.push(
          new Error(`GeoPublish: asset "${this.options.moduleName}" introuvable (le zip a-t-il été généré ?)`)
        );
        return;
      }

      // Après l'émission, webpack 5 libère le contenu (SizeOnlySource) : on relit le fichier sur disque
      const outputPath = compilation.getPath(compilation.outputOptions.path);
      const source = fs.readFileSync(path.join(outputPath, this.options.moduleName));
      const module = {
        type: "CODE",
        data: Buffer.from(source).toString("base64"),
        name: this.extensionDefinition.name
      };

      console.log(`Publication de "${this.extensionDefinition.name}" sur ${this.options.server}...`);
      try {
        const id = await this.publisher.createOrUpdateExtensionFromZip(this.extensionDefinition, module);
        console.log("Extension publiée avec succès", id);
      } catch (err) {
        compilation.errors.push(new Error(`GeoPublish: erreur lors de la publication sur GEO : ${err.message}`));
      }
    });
  }

  getExtensionDefinition() {
    if (_.isString(this.options.definition)) {
      return JSON.parse(fs.readFileSync(this.options.definition, "utf8"));
    }
    return this.options.definition;
  }
}

module.exports = GeoPublishExtension;
