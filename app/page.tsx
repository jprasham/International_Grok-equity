import { PageBody, PageHero, Section } from "@/components/terminal";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ResearchForm } from "./research-form";

const SYNTAX = [
  ["RELIANCE", "NSE symbol"],
  ["BAJAJ-AUTO", "hyphens are valid"],
  ["M&M", "so are ampersands"],
  ["500325", "BSE scrip code"],
];

export default function Home() {
  return (
    <>
      <PageHero title="Research a ticker." sub="Indian equities · NSE & BSE" />
      <PageBody className="grid items-start gap-8 lg:grid-cols-[3fr_2fr]">
        <Section code="01" name="New research" desc="Opens the report when you run it">
          <ResearchForm />
        </Section>
        <Section code="02" name="Accepted formats">
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Example</TableHead>
                  <TableHead scope="col">Format</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SYNTAX.map(([ticker, note]) => (
                  <TableRow key={ticker}>
                    <TableCell className="font-mono">{ticker}</TableCell>
                    <TableCell className="text-muted-foreground">{note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Section>
      </PageBody>
    </>
  );
}
