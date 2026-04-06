import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateService {
  populateTemplate(
    templateName: string,
    data: any,
    passengers?: any[],
  ): string {
    const templatePath = path.resolve(
      process.cwd(),
      'src/mail/templates',
      `${templateName}.html`,
    );

    let html = fs.readFileSync(templatePath, 'utf8');

    if (passengers?.length) {
      html = this.expandPassengerLoop(html, passengers);
    }

    html = html.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
      return data[key] ?? '';
    });

    return html;
  }

  private expandPassengerLoop(html: string, passengers: any[]) {
    const loopPattern =
      /<!--[\s\S]*?LOOP START[\s\S]*?-->([\s\S]*?)<!--\s*LOOP END[\s\S]*?-->/;

    const match = html.match(loopPattern);
    if (!match) return html;

    const rowTemplate = match[1];

    const rows = passengers
      .map((p) =>
        rowTemplate.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
          return (
            {
              PASSENGER_NAME: p.name,
              ID_DNI: p.idDni,
              SEAT: p.seat,
              DECK: p.deck,
            }[key] ?? ''
          );
        }),
      )
      .join('');

    return html.replace(loopPattern, rows);
  }
}
