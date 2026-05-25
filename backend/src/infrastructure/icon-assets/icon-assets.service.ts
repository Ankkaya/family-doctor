import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from '@/infrastructure/minio/minio.service';

type IconVariant = 'default' | 'white';

@Injectable()
export class IconAssetsService {
  private readonly logger = new Logger('IconAssetsService');
  private readonly iconifyApiBase = (process.env.ICONIFY_API_BASE || 'https://api.iconify.design').replace(/\/+$/, '');
  private readonly legacyIconAliasMap: Record<string, string> = {
    setting: 'material-symbols:settings-outline',
    user: 'material-symbols:person-outline',
    peoples: 'material-symbols:groups-outline',
    menu: 'material-symbols:menu',
    database: 'material-symbols:database-outline',
    log: 'material-symbols:history-rounded',
    upload: 'mdi:cloud-upload-outline',
  };

  constructor(private readonly minioService: MinioService) {}

  async resolveIconUrl(icon?: string | null, variant: IconVariant = 'default'): Promise<string | null> {
    const parsed = this.parseIconifyId(icon);
    if (!parsed) {
      return null;
    }

    const objectKey = this.buildObjectKey(parsed.collection, parsed.name, variant);

    if (await this.minioService.fileExists(objectKey)) {
      return this.minioService.getStoredFileProxyUrl(objectKey);
    }

    const svg = await this.fetchIconSvg(parsed.collection, parsed.name, variant);
    if (!svg) {
      return null;
    }

    await this.minioService.uploadBuffer(
      Buffer.from(svg),
      `${parsed.name}.svg`,
      this.buildObjectDirectory(parsed.collection, variant),
      'image/svg+xml',
    );

    return this.minioService.getStoredFileProxyUrl(objectKey);
  }

  private parseIconifyId(icon?: string | null): { collection: string; name: string } | null {
    if (!icon) {
      return null;
    }

    const trimmed = icon.trim();
    if (!trimmed) {
      return null;
    }

    const normalized = this.normalizeLegacyIcon(trimmed);
    const parts = normalized.split(':');
    if (parts.length !== 2) {
      return null;
    }

    const [collection, name] = parts;
    if (!/^[a-z0-9-]+$/i.test(collection) || !/^[a-z0-9-]+$/i.test(name)) {
      return null;
    }

    return {
      collection: collection.toLowerCase(),
      name: name.toLowerCase(),
    };
  }

  private normalizeLegacyIcon(icon: string): string {
    const lowerCased = icon.toLowerCase();
    if (this.legacyIconAliasMap[lowerCased]) {
      return this.legacyIconAliasMap[lowerCased];
    }

    if (/^[A-Z][A-Za-z0-9]+$/.test(icon)) {
      return `ion:${this.pascalToKebab(icon)}`;
    }

    return icon;
  }

  private pascalToKebab(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, '$1-$2')
      .toLowerCase();
  }

  private buildObjectDirectory(collection: string, variant: IconVariant): string {
    const suffix = variant === 'white' ? 'white' : 'default';
    return `icons/${suffix}/${collection}`;
  }

  private buildObjectKey(collection: string, name: string, variant: IconVariant): string {
    return `${this.buildObjectDirectory(collection, variant)}/${name}.svg`;
  }

  private async fetchIconSvg(collection: string, name: string, variant: IconVariant): Promise<string | null> {
    const url = `${this.iconifyApiBase}/${collection}:${name}.svg`;

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'image/svg+xml',
        },
      });

      if (!response.ok) {
        this.logger.warn(`获取 Iconify SVG 失败: ${collection}:${name}, status=${response.status}`);
        return null;
      }

      const rawSvg = await response.text();
      return this.normalizeSvg(rawSvg, variant);
    } catch (error) {
      this.logger.warn(`获取 Iconify SVG 异常: ${collection}:${name}, error=${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private normalizeSvg(svg: string, variant: IconVariant): string {
    let normalized = svg
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\s(width|height)=["'][^"']*%[^"']*["']/gi, '')
      .replace(/currentColor/gi, variant === 'white' ? '#ffffff' : 'currentColor')
      .trim();

    if (variant === 'white') {
      normalized = normalized
        .replace(/\s(fill|stroke)=["'](?!none\b|url\()[^"']*["']/gi, (_match, attr: string) => ` ${attr}="#ffffff"`)
        .replace(/\sstyle=["']([^"']*)["']/gi, (_match, styleText: string) => {
          const updatedStyle = styleText
            .replace(/(^|;)\s*color\s*:\s*[^;]+/gi, '$1color:#ffffff')
            .replace(/(^|;)\s*fill\s*:\s*(?!none\b|url\()[^;]+/gi, '$1fill:#ffffff')
            .replace(/(^|;)\s*stroke\s*:\s*(?!none\b|url\()[^;]+/gi, '$1stroke:#ffffff');
          return ` style="${updatedStyle}"`;
        });

      if (!/\scolor=/.test(normalized)) {
        normalized = normalized.replace('<svg', '<svg color="#ffffff"');
      }
    }

    if (!/\swidth=/.test(normalized)) {
      normalized = normalized.replace('<svg', '<svg width="24"');
    }

    if (!/\sheight=/.test(normalized)) {
      normalized = normalized.replace('<svg', '<svg height="24"');
    }

    return normalized;
  }
}
