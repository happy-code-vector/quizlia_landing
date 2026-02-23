import Link from "next/link"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function PricingSection() {
  return (
    <section id="pricing" className="bg-accent/30 py-16 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary font-medium">Pricing</div>
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight text-primary">
              Choose the plan that's right for you
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              From casual collectors to serious dealers, we have options for everyone.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
          <Card className="flex flex-col border-primary/20 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary/90">Free</CardTitle>
              <div className="text-3xl font-bold">$0</div>
              <CardDescription>Perfect for beginners</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>10 identifications per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Basic item information</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>General time period identification</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Ad-supported experience</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full border-primary/50 hover:bg-primary/10 hover:text-primary" variant="outline" asChild>
                <Link href="https://apps.apple.com/us/app/antique-identifier-by-picture/id6736771469">
                  Download Free
                </Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="flex flex-col border-primary bg-card/80 backdrop-blur-sm shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">Popular</div>
            <CardHeader>
              <CardTitle className="text-primary/90">Premium</CardTitle>
              <div className="text-3xl font-bold">$7.99<span className="text-sm font-normal">/month</span></div>
              <CardDescription>For enthusiasts and collectors</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Unlimited identifications</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Detailed item information</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Value estimation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Historical context and provenance</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Ad-free experience</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                <Link href="https://apps.apple.com/us/app/antique-identifier-by-picture/id6736771469">
                  Get Premium
                </Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="flex flex-col border-primary/20 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary/90">Annual</CardTitle>
              <div className="text-3xl font-bold">$59.99<span className="text-sm font-normal">/year</span></div>
              <CardDescription>Save 37% with annual billing</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>All Premium features</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Priority identification</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Collection management tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Export and sharing capabilities</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Early access to new features</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full border-primary/50 hover:bg-primary/10 hover:text-primary" variant="outline" asChild>
                <Link href="https://apps.apple.com/us/app/antique-identifier-by-picture/id6736771469">
                  Get Annual Plan
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}